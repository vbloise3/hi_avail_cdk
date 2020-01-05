#!/usr/bin/env python3

from aws_cdk import core

from hi_avail_cdk.hi_avail_cdk_stack import HiAvailCdkStack


app = core.App()
HiAvailCdkStack(app, "hi-avail-cdk", env=core.Environment(region="us-east-1", account="001178231653"))

app.synth()
