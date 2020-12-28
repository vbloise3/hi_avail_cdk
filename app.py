#!/usr/bin/env python3

from aws_cdk import core

from NAT_vpc_stack import HiAvailCdkStack


app = core.App()
HiAvailCdkStack(app, "hi-avail-cdk-east", env=core.Environment(region="us-east-1"), stack_tag="UsEastStack")


app.synth()
