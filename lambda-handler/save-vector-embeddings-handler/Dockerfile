FROM public.ecr.aws/lambda/python:3.9

COPY ./requirements.txt ${LAMBDA_TASK_ROOT}/

RUN python3 -m pip install -r requirements.txt --target ${LAMBDA_TASK_ROOT}

COPY main.py ${LAMBDA_TASK_ROOT}/

CMD [ "main.handler" ]
