package main

import (
	"fmt"

	"github.com/spf13/cobra"
)

func main() {

	var source, key, bucket, outFile, acl string
	var compress bool

	var cmdPut = &cobra.Command{
		//TODO: concurrent multipart uploads
		Use:   "put -a ACL -b bucket -k key -s source",
		Short: "Store a file in S3 with key k",
		Long:  `Streams either stdin or key k to S3`,
		Run: func(cmd *cobra.Command, args []string) {
			if err := PutExecute(cmd, args); err != nil {
				fmt.Println("Command failed", err)
			}
		},
	}

	var cmdTar = &cobra.Command{
		Use:   "tar -b bucket [-o outfile] [-c compress]",
		Short: "Tar up the contents of an s3 bucket",
		Long:  `By default sends tar to stdout, or can save to a file`,
		Run: func(cmd *cobra.Command, args []string) {
			if err := TarExecute(cmd, args); err != nil {
				fmt.Println("Command failed", err)
			}
		},
	}

	cmdTar.Flags().StringVarP(&bucket, "bucket", "b", "", "S3 bucket to use")
	cmdTar.Flags().StringVarP(&outFile, "outfile", "o", "", "Outfile to use, default stdout")
	cmdTar.Flags().BoolVarP(&compress, "compress", "c", false, "Whether to gzip the file or not")

	cmdPut.Flags().StringVarP(&bucket, "bucket", "b", "", "S3 bucket to use")
	cmdPut.Flags().StringVarP(&key, "key", "k", "", "Key to save file to")
	cmdPut.Flags().StringVarP(&source, "source", "s", "", "Source to save. Default stdin")
	cmdPut.Flags().StringVar(&acl, "acl", "private", "Options: authenticated-read, private, public-read, public-read-write")

	var rootCmd = &cobra.Command{Use: "tarsync"}

	var secretKey, accessKey, region string
	rootCmd.PersistentFlags().StringVar(&secretKey, "secret-access-key", "", "AWS secret key")
	rootCmd.PersistentFlags().StringVar(&accessKey, "access-key-id", "", "AWS access key ID")
	rootCmd.PersistentFlags().StringVarP(&region, "region", "r", "us-east-1", "AWS region to use")

	rootCmd.AddCommand(cmdTar, cmdPut)
	rootCmd.Execute()
}
