package main

import (
	"fmt"
	"os"

	"github.com/Sirupsen/logrus"
	"github.com/spf13/cobra"
)

var log = logrus.New()

func init() {
	// Log as JSON instead of the default ASCII formatter.
	log.Formatter = new(logrus.JSONFormatter)

	// Output to stderr instead of stdout, could also be a file.
	log.Out = os.Stderr
}

func main() {

	var source, key, fromBucket, toBucket, bucket, outFile, acl string
	var quiet, compress bool

	var cmdPut = &cobra.Command{
		//TODO: concurrent multipart uploads
		Use:   "put -a ACL -b bucket -k key -s source",
		Short: "Store a file in S3 with key k",
		Long:  `Streams either stdin or key k to S3`,
		Run: func(cmd *cobra.Command, args []string) {
			if err := PutExecute(cmd, args); err != nil {
				log.Fatal("Put command failed", err)
			}
		},
	}

	var cmdTar = &cobra.Command{
		Use:   "tar -b bucket [-o outfile] [-c compress]",
		Short: "Tar up the contents of an s3 bucket",
		Long:  `By default sends tar to stdout, or can save to a file`,
		Run: func(cmd *cobra.Command, args []string) {
			if err := TarExecute(cmd, args); err != nil {
				log.Fatal("Tar command failed", err)
			}
		},
	}

	var cmdTarStream = &cobra.Command{
		Use:   "tarstream -f bucket -t bucket -k key -c compress",
		Short: "Tar up the contents of an s3 bucket and stream that back to S3",
		Long:  `By default sends tar to stdout, or can save to a file`,
		Run: func(cmd *cobra.Command, args []string) {
			if err := TarBucketExecute(cmd, args); err != nil {
				log.Fatal("Tarstream command failed", err)
			}
		},
	}

	cmdTar.Flags().StringVarP(&bucket, "bucket", "b", "", "S3 bucket to use")
	cmdTar.Flags().StringVarP(&outFile, "outfile", "o", "", "Outfile to use, default stdout")
	cmdTar.Flags().BoolVarP(&compress, "compress", "c", false, "Whether to gzip the file or not")

	cmdTarStream.Flags().StringVarP(&toBucket, "from-bucket", "f", "", "S3 bucket to use")
	cmdTarStream.Flags().StringVarP(&fromBucket, "to-bucket", "t", "", "S3 bucket to use")
	cmdTarStream.Flags().StringVarP(&outFile, "key", "k", "", "Key to save file to")
	cmdTarStream.Flags().BoolVarP(&compress, "compress", "c", false, "Whether to gzip the file or not")
	cmdTarStream.Flags().StringVar(&acl, "acl", "private", "Options: authenticated-read, private, public-read, public-read-write")

	cmdPut.Flags().StringVarP(&bucket, "bucket", "b", "", "S3 bucket to use")
	cmdPut.Flags().StringVarP(&key, "key", "k", "", "Key to save file to")
	cmdPut.Flags().StringVarP(&source, "source", "s", "", "Source to save. Default stdin")
	cmdPut.Flags().StringVar(&acl, "acl", "private", "Options: authenticated-read, private, public-read, public-read-write")

	var rootCmd = &cobra.Command{Use: "tarsync"}

	var secretKey, accessKey, region string
	rootCmd.PersistentFlags().StringVar(&secretKey, "secret-access-key", "", "AWS secret key")
	rootCmd.PersistentFlags().StringVar(&accessKey, "access-key-id", "", "AWS access key ID")
	rootCmd.PersistentFlags().StringVarP(&region, "region", "r", "us-east-1", "AWS region to use")
	// TODO actually have the --quiet flag turn down logging
	rootCmd.PersistentFlags().BoolVarP(&quiet, "quiet", "q", false, "Reduce log output")

	rootCmd.AddCommand(cmdTar, cmdPut, cmdTarStream)
	rootCmd.Execute()
}
