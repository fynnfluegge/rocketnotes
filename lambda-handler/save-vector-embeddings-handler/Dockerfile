FROM public.ecr.aws/lambda/python:3.9

COPY ./requirements.local.txt ${LAMBDA_TASK_ROOT}/

RUN python3 -m pip install -r requirements.local.txt --target ${LAMBDA_TASK_ROOT}

COPY main.py ${LAMBDA_TASK_ROOT}/

CMD [ "main.handler" ]
