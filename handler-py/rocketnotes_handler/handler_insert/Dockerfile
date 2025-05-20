FROM public.ecr.aws/lambda/python:3.12

COPY handler_insert/main.py ${LAMBDA_TASK_ROOT}

COPY lib/ ${LAMBDA_TASK_ROOT}/rocketnotes_handler/lib/

COPY handler_insert/requirements.txt.lambda ${LAMBDA_TASK_ROOT}

RUN pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt.lambda -t ${LAMBDA_TASK_ROOT}

CMD ["main.handler"]
