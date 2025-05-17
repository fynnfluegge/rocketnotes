#!/usr/bin/env python3
import os

import aws_cdk as cdk

from rocketnotes_handler.rocketnotes_handler_stack import \
    RocketnotesHandlerStack

app = cdk.App()
RocketnotesHandlerStack(
    app,
    "RocketnotesHandlerStack",
    env=cdk.Environment(
        account=os.getenv("AWS_ACCOUNT"),
        region=os.getenv("AWS_REGION"),
    ),
)

app.synth()
