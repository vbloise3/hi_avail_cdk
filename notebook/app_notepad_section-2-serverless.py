# need to update cdk: npm update -g aws-cdk

#!/usr/bin/env python3

from aws_cdk import core

from hi_avail_cdk.hi_avail_cdk_stack import HiAvailCdkStack


app = core.App()
HiAvailCdkStack(app, "hi-avail-cdk-east", env=core.Environment(region="us-east-1"), stack_tag="UsEastStack")

app.synth()
