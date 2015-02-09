package main

import (
	"bytes"
	"io/ioutil"
	"log"

	"github.com/awslabs/aws-sdk-go/aws"
	awss3 "github.com/awslabs/aws-sdk-go/gen/s3"
	"github.com/spf13/cobra"
)

func TarBucketExecute(cmd *cobra.Command, args []string) (err error) {
	awsCreds := aws.DetectCreds(
		cmd.Flag("access-key-id").Value.String(),
		cmd.Flag("secret-access-key").Value.String(),
		"",
	)
	s3 := awss3.New(awsCreds, cmd.Flag("region").Value.String(), nil)

	if cmd.Flag("to-bucket").Value.String() == "" {
		log.Fatalln("no source bucket")
	}
	if cmd.Flag("from-bucket").Value.String() == "" {
		log.Fatalln("no destination bucket")
	}
	key := cmd.Flag("key").Value.String()
	if key == "" {
		log.Fatalln("no target key ")
	}
	buf := new(bytes.Buffer)

	err = tarBucket(s3, cmd.Flag("from-bucket").Value.String(), buf, cmd.Flag("compress").Changed)
	if err != nil {
		log.Fatalln("Failed to get data")
		return
	}
	err = putObject(s3, cmd.Flag("to-bucket").Value.String(), key, ioutil.NopCloser(buf), cmd.Flag("acl").Value.String(), int64(buf.Len()))
	return
}
