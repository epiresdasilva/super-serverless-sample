# SSS - Super Serverless Sample

Esse é um projeto de exemplo de arquitetura serverless usando como inspiração a votação para eliminação do paredão do BBB.
Nessas votações, o sistema da Globo recebe uma alta carga de execuções e precisa de uma arquitetura que consiga processar tudo isso.

## Arquitetura

![](assets/sss-arquitetura.jpg)

Explicação sobre cada recurso utilizado
* API Gateway: recebimento das requisições através de uma API Rest e enviando de forma assíncrona para processamento, proporcionando um alto *throughput*
* EventBridge: poderoso broker de mensagens que permite a execução paralela de cada mensagem de forma massiva. Alta capacidade de processamento das mensagens no mesmo ritmo que é recebido
* DynamoDB: armazenamento dos votos individuais
* SQS: envio de mensagens em lotes para processo assíncrono de contagem dos votos. O envio de lotes proporciona uma contagem mais rápida. Ao mesmo tempo, o SQS permite um processamento alto e controlado para não sobrecarregar o banco de dados
* RDS (Aurora Serverless): armazenamento da contagem dos votos, permitindo o incremento do valor e emissão de relatórios de forma mais otimizada

### Desafio da definição da arquitetura

Esse desenho de arquitetura mostrado anteriormente é a versão final, mas precisei iterar sobre ele para chegar nessas conclusões. Por isso, quero registrar também as escolhas que não atenderam as necessidades.
Para começar, é importante dizer que serverless te entrega escala sem preocupação, mas isso não significa que você terá a escala necessária para resolver o seu problema. Isso porque cada serviço tem suas característica e apesar de em termos de infraestrutura você não ficar na mão, você pode ainda ter problema de vazão.

#### API Gateway e SQS

Na primeira tentativa, utilizei o SQS conectado ao API Gateway para receber os votos de forma assíncrona direto do endpoint. Em termos de disponibilidade não tive nenhum problema, mas o consumo dessas mensagens não atendia a velocidade de contabilização de votos que precisava.
Por esse motivo, o uso de um Broker como o EventBridge fez mais sentido.

#### DynamoDB Stream

Também na primeira versão da arquitetura, ao invés do uso de SQS como Destination da Lambda de registro de votos, eu havia utilizado a Lambda conectada no DynamoDB Stream para ouvir os eventos de cadastro. Em termos funcionais funcionou muito bem, mas assim como o Kinesis, o DynamoDB Stream trabalha com o conceito de `shard`. Sendo assim, só é possível paralelizar a mesma quantidade de `shards` configuradas no DynamoDB.
Mesmo tendo a opção de paralelizar e aumentar a capacidade, ainda ficou aquém da velocidade necessária para o problema.

## Executar

Esse projeto utiliza Serverless Framework para gerar a infraestrutura como código. Por esse motivo, fica fácil reproduzir essa aplicação em sua própria conta da AWS.

Basta executar o comando abaixo na raiz do projeto:
```
sls deploy
```

Antes de realizar uma chamada para o endpoint, você precisa criar uma tabela no seu banco de dados RDS:
```sql
create table vote_bag_count (id serial primary key, name text, vote_count integer, saved_at timestamp);
```

## Estatísticas

### Teste de carga

* Nos testes mais simples: 5k requisições por segundo
    * 10 segundos de duração
    * 50k requisições no total
* Testes de processamento: 20k requisições por segundo
    * 60 segundos de duração
    * 1,2mi requisições no total
    * Tempo de processamento do placar: 25 minutos

### Desenvolvimento

O desenvolvimento todo foi realizado dentro de uma semana, trabalhando somente em dias úteis em torno de 2 horas por dia. Um total de 10 horas de desenvolvimento.

### Custos

Os valores abaixo são do intervalo todo de desenvolvimento, portanto esses custos incluem todos os testes realizados inúmeras vezes e não somente o teste final que resultou na estatística citada anteriormente.

* RDS: US$ 2,90 / dia
* VPC: US$ 1,44 / dia
* Lambda: US$ 1,00 total
* API Gateway: US$ 7,12 total
* DynamoDB: US$ 2,46 total
* SQS: US$ 0,21 total
* **Total: US$ 52,57**

## O que ainda poderia ser feito

* Abordagem mais robusta de dados: processar as mensagens mais rapidamente
    * Near realtime com Kinesis, por exemplo
* Pipeline para deploy automatizado: não precisar de deploy manual
* Utilização de SecretsManager: basicamente para proteger a credencial do banco de dados RDS
