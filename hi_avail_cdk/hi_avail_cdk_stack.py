from aws_cdk import (
    aws_ec2 as ec2,
    aws_route53 as route53,
    aws_s3 as s3,
    aws_s3_deployment as s3deploy,
    aws_route53_targets as targets,
    core,
)


class HiAvailCdkStack(core.Stack):

    def __init__(self, scope: core.Construct, id: str, *, stack_tag="default", **kwargs) -> None:
        super().__init__(scope, id, **kwargs)

        website_bucket = s3.Bucket(self, "BucketWebsite",
            bucket_name="www.portfoliovbl.com",
            website_index_document="index.html",
            public_read_access=True
        )

        s3deploy.BucketDeployment(self, "DeployWebsite",
            sources=[s3deploy.Source.asset("./user_data/portfolio.zip")],
            destination_bucket=website_bucket,
            # destination_key_prefix="web/static"
        )
        
        my_zone = route53.PublicHostedZone(self, "HostedZone",
            zone_name="portfoliovbl.com"
        )

        route53.ARecord(self, "AlaisRecord",
            zone=my_zone,
            record_name="www",
            target=route53.RecordTarget.from_alias(targets.BucketWebsiteTarget(website_bucket))
        )
