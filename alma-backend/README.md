# ALMA - Back-end

API REST para a plataforma ALMA, gerenciando usuários, autenticação e registro de humor.

## Tecnologias

- Node.js, Express
- PostgreSQL
- Sequelize ORM
- JWT para autenticação

## Instalação

Clone o repositório e entre na pasta do backend:

```bash
git clone https://github.com/seuusuario/alma.git
cd alma-backend
npm install
```
- Crie o arquivo .env com as variáveis de ambiente (exemplo):
```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=sua_senha
DB_NAME=alma
PORT=3000
JWT_SECRET=sua_chave_jwt
```
- Inicie o servidor:
```bash
npm start
``` 
## Uso
- Fornece endpoints para cadastro, login, registro e consulta de humor.

- Integre com o front-end para funcionalidades completas.
