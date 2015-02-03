package main

import (
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

	var acl awss3.StringValue
	switch a := cmd.Flag("acl").Value.String(); a {
	case "private":
		acl = aws.String(awss3.BucketCannedACLPrivate)
	case "authenticated-read":
		acl = aws.String(BucketCannedACLAuthenticatedRead)
	case "public-read":
		acl = aws.String(BucketCannedACLPublicRead)
	case "public-read-write":
		acl = aws.String(BucketCannedACLPublicReadWrite)
	default:
		acl = aws.String(awss3.BucketCannedACLPrivate)
	}

	in := cmd.Flag("source").Value.String()
	r, err := os.Open(in)
	if err != nil {
		if in == "" {
			r = os.Stdin
		} else {
			return
		}
	}
	defer r.Close()
	_, err = s3.PutObject(&awss3.PutObjectRequest{
		Key:          aws.String(cmd.Flag("key").Value.String()),
		Body:         r,
		ACL:          acl,
		StorageClass: aws.String(awss3.ObjectStorageClassStandard),
	})
	return
}
