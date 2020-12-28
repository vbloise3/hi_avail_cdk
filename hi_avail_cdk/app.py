#!/usr/bin/env python3

from aws_cdk import core

from NAT_vpc_stack import NATCdkStack


app = core.App()
NATCdkStack(app, "NATCdkStack", env=core.Environment(region="us-east-1"))


app.synth()
