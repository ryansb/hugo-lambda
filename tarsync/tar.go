package main

import (
	"archive/tar"
	"compress/gzip"
	"io"
	"log"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/awslabs/aws-sdk-go/aws"
	awss3 "github.com/awslabs/aws-sdk-go/gen/s3"
	"github.com/spf13/cobra"
)

func TarExecute(cmd *cobra.Command, args []string) (err error) {
	awsCreds := aws.DetectCreds(
		cmd.Flag("access-key-id").Value.String(),
		cmd.Flag("secret-access-key").Value.String(),
		"",
	)
	s3 := awss3.New(awsCreds, cmd.Flag("region").Value.String(), nil)

	out := cmd.Flag("outfile").Value.String()
	w, err := os.Create(out)
	if err != nil {
		if out == "" {
			w = os.Stdout
			err = nil
		} else {
			return
		}
	}
	defer w.Close()

	if cmd.Flag("compress").Changed {
		gzw := gzip.NewWriter(w)
		defer gzw.Close()
		err = tarBucket(s3, cmd.Flag("bucket").Value.String(), gzw)
	} else {
		err = tarBucket(s3, cmd.Flag("bucket").Value.String(), w)
	}
	return
}

type fileInfo struct {
	Name string
	Size int64
	Body io.ReadCloser
}

func tarBucket(s3 *awss3.S3, bucket string, w io.Writer) (err error) {
	var wg sync.WaitGroup
	// allow up to 1000 keys to be buffered
	workChan := make(chan string, 1000)

	// list all of the objects and add their keys to a work channel
	go listBucket(s3, bucket, workChan)

	// make a tarfile
	tarIo := tar.NewWriter(w)

	// get all the keys
	doneChan := make(chan *fileInfo)
	for i := 0; i < 30; i++ {
		// worker pool of 30 goroutines to grab all the actual files
		wg.Add(1)
		go func() {
			for key := range workChan {
				resp, err := s3.GetObject(&awss3.GetObjectRequest{
					Key:    aws.String(key),
					Bucket: aws.String(bucket),
				})
				if err != nil {
					log.Fatalln("Found error %s", err.Error())
					return
				}
				fi := &fileInfo{
					Name: key,
					Size: *resp.ContentLength,
					Body: resp.Body,
				}
				doneChan <- fi
			}
			wg.Done()
		}()
	}

	go func() {
		wg.Wait()
		close(doneChan)
	}()

	// if we don't set the timestamp, it is set automatically to
	// zero, which causes tar to throw lots of angry warnings.
	modstamp := time.Now()
	for {
		file, ok := <-doneChan
		if !ok {
			break
		}
		var fmode int64
		if strings.HasSuffix(file.Name, "/") {
			fmode = 0755
		} else {
			fmode = 0644
		}
		tarIo.WriteHeader(&tar.Header{
			Name:       file.Name,
			Mode:       fmode,
			Size:       file.Size,
			ModTime:    modstamp,
			ChangeTime: modstamp,
			AccessTime: modstamp,
		})
		if _, err = io.Copy(tarIo, file.Body); err != nil {
			log.Fatalln("Failed to write tarfile", err)
			return
		}
		file.Body.Close()
	}

	err = tarIo.Close()
	return
}

func listBucket(s3 *awss3.S3, bucket string, workChan chan string) {
	next := aws.String("")
	for {
		list, err := s3.ListObjects(&awss3.ListObjectsRequest{
			MaxKeys: aws.Integer(500),
			Bucket:  aws.String(bucket),
			Marker:  next,
		})
		if err != nil {
			log.Fatalln("Failed to list bucket", err)
		}
		next = list.NextMarker
		for _, i := range list.Contents {
			workChan <- *i.Key
		}
		if len(list.Contents) < 500 {
			break
		}
	}
	close(workChan)
}
