FROM python:3.12-alpine

RUN apk add --no-cache gcc musl-dev libffi-dev libldap libsasl libressl bash 
ENV PYTHONUNBUFFERED 1
ENV PYTHONDONTWRITEBYTECODE 1
RUN mkdir /code
WORKDIR /code

ADD . .
RUN pip install -r requirements.txt

CMD [ "python3", "manage.py", "runserver", "0.0.0.0:8000" ]
