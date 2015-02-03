package main

import (
	"io"
	"log"
	"os"

	"github.com/awslabs/aws-sdk-go/aws"
	awss3 "github.com/awslabs/aws-sdk-go/gen/s3"
	"github.com/spf13/cobra"
)

func PutExecute(cmd *cobra.Command, args []string) (err error) {
	awsCreds := aws.DetectCreds(
		cmd.Flag("access-key-id").Value.String(),
		cmd.Flag("secret-access-key").Value.String(),
		"",
	)
	s3 := awss3.New(awsCreds, cmd.Flag("region").Value.String(), nil)
	bucket := cmd.Flag("bucket").Value.String()
	if bucket == "" {
		log.Fatalln("no target bucket")
	}
	key := cmd.Flag("key").Value.String()
	if key == "" {
		log.Fatalln("no target bucket")
	}

	in := cmd.Flag("source").Value.String()
	r, err := os.Open(in)
	if err != nil {
		if in == "" {
			log.Fatalln("STDIN is not yet supported. It will be added with multipart uploads")
			r = os.Stdin
			err = nil
		} else {
			return
		}
	}
	defer r.Close()
	s, _ := r.Stat()
	err = putObject(s3, bucket, key, r, cmd.Flag("acl").Value.String(), s.Size())
	return
}

func putObject(s3 *awss3.S3, bucket string, key string, r io.ReadCloser, a string, size int64) (err error) {
	var acl aws.StringValue
	switch a {
	case "private":
		acl = aws.String(awss3.BucketCannedACLPrivate)
	case "authenticated-read":
		acl = aws.String(awss3.BucketCannedACLAuthenticatedRead)
	case "public-read":
		acl = aws.String(awss3.BucketCannedACLPublicRead)
	case "public-read-write":
		acl = aws.String(awss3.BucketCannedACLPublicReadWrite)
	default:
		acl = aws.String(awss3.BucketCannedACLPrivate)
	}
	_, err = s3.PutObject(&awss3.PutObjectRequest{
		Key:           aws.String(key),
		Bucket:        aws.String(bucket),
		Body:          r,
		ContentLength: aws.Long(size),
		ACL:           acl,
		StorageClass:  aws.String(awss3.ObjectStorageClassStandard),
	})
	return
}
