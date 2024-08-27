# syntax=docker/dockerfile:1
FROM python:3.11
WORKDIR /code
#RUN apk add --no-cache gcc musl-dev linux-headers g++
RUN pip install cython
RUN pip install numpy==1.26.4
COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt
EXPOSE 5000
COPY . .
CMD ["bash", "./start.sh"]
