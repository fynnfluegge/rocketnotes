import aws_cdk as core
import aws_cdk.assertions as assertions

from rocketnotes_agents.rocketnotes_agents_stack import RocketnotesAgentsStack

# example tests. To run these tests, uncomment this file along with the example
# resource in rocketnotes_agents/rocketnotes_agents_stack.py
def test_sqs_queue_created():
    app = core.App()
    stack = RocketnotesAgentsStack(app, "rocketnotes-agents")
    template = assertions.Template.from_stack(stack)

#     template.has_resource_properties("AWS::SQS::Queue", {
#         "VisibilityTimeout": 300
#     })
