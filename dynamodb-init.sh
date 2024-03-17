# create tables
aws dynamodb create-table --endpoint-url http://localhost:8041 --table-name tnn-Tree \
--attribute-definitions AttributeName=id,AttributeType=S \
--key-schema AttributeName=id,KeyType=HASH \
--provisioned-throughput ReadCapacityUnits=2,WriteCapacityUnits=2 \
> /dev/null 2>&1

aws dynamodb create-table --endpoint-url http://localhost:8041 --table-name tnn-Documents \
--attribute-definitions AttributeName=id,AttributeType=S \
--key-schema AttributeName=id,KeyType=HASH \
--provisioned-throughput ReadCapacityUnits=2,WriteCapacityUnits=2 \
> /dev/null 2>&1


aws dynamodb update-table \
--endpoint-url http://localhost:8041 \
--table-name tnn-Documents \
--attribute-definitions AttributeName=userId,AttributeType=S \
--global-secondary-index-updates \
"[{\"Create\":{\"IndexName\":\"userId-index\",\"KeySchema\":[{\"AttributeName\":\"userId\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"},\"ProvisionedThroughput\":{\"ReadCapacityUnits\":1,\"WriteCapacityUnits\":1}}}]" \
> /dev/null 2>&1

aws dynamodb create-table --endpoint-url http://localhost:8041 --table-name tnn-Vectors \
--attribute-definitions AttributeName=id,AttributeType=S \
--key-schema AttributeName=id,KeyType=HASH \
--provisioned-throughput ReadCapacityUnits=2,WriteCapacityUnits=2 \
> /dev/null 2>&1

# create document tree
aws dynamodb put-item --endpoint-url http://localhost:8041 --table-name tnn-Tree \
--item '{"id": {"S": "4afe1f16-add0-11ed-afa1-0242ac120002"},"documents": {"L": [{"M": {"id": {"S": "5b6ae09e-c32a-45ee-bb3b-1c65fc943a9c"},"children": {"NULL": true},"name": {"S": "Cheat Sheet"},"parent": {"S": "root"},"pinned": {"BOOL": false}}}]},"pinned": {"NULL": true},"trash": {"NULL": true}}' \
> /dev/null 2>&1

# create document
aws dynamodb put-item --endpoint-url http://localhost:8041 --table-name tnn-Documents \
--item '{"id": {"S": "5b6ae09e-c32a-45ee-bb3b-1c65fc943a9c"},"content": {"S": "<p align=center>\nThis document provides a general introduction to Markdown syntax and some extensive features, and is intended to serve as a handy cheat sheet for you.\n</p>\n\n# H1\n## H2\n### H3  \n**bold text**  \n*italicized text*  \n~~The world is flat.~~\n\n1. First item\n2. Second item\n3. Third item\n- First item\n- Second item\n- Third item\n\n[some_link](https://www.example.com)\n\n![alt text](https://picsum.photos/200)\n\n---\n\n| Syntax | Description |\n| ----------- | ----------- |\n| Header | Title |\n| Paragraph | Text |\n\n---\n\n\n```\n$ docker run -t -i --rm ubuntu bash\n```\n\n```javascript\nvar doSomeStuff = function(data) {\n     var searchForm = $(#some_form);\n     var searchParms = [];\n\n     for (var i = 0; i < data; i++) {\n         searchParms[i] = data[i];\n     }\n};\n```\n\n---\n"},"lastModified": {"NULL": true},"parentId": {"NULL": true},"title": {"S": "Cheat Sheet"},"userId": {"S": "NULL"}, "searchContent": {"S": "<p align=center>\nthis document provides a general introduction to markdown syntax and some extensive features, and is intended to serve as a handy cheat sheet for you.\n</p>\n\n# h1\n## h2\n### h3  \n**bold text**  \n*italicized text*  \n~~the world is flat.~~\n\n1. first item\n2. second item\n3. third item\n- first item\n- second item\n- third item\n\n[some_link](https://www.example.com)\n\n![alt text](https://picsum.photos/200)\n\n---\n\n| syntax | description |\n| ----------- | ----------- |\n| header | title |\n| paragraph | text |\n\n---\n\n\n```\n$ docker run -t -i --rm ubuntu bash\n```\n\n```javascript\nvar dosomestuff = function(data) {\n     var searchform = $(#some_form);\n     var searchparms = [];\n\n     for (var i = 0; i < data; i++) {\n         searchparms[i] = data[i];\n     }\n};\n```\n\n---\n"}}' \
> /dev/null 2>&1
