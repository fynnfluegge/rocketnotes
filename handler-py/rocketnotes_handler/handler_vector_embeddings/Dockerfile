FROM public.ecr.aws/lambda/python:3.12

COPY requirements.lambda.txt ${LAMBDA_TASK_ROOT}

RUN pip install -r requirements.lambda.txt

COPY main.py ${LAMBDA_TASK_ROOT}

CMD [ "main.handler" ]
