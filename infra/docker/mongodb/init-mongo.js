// Inicialização do banco do Credit Analysis Service (MongoDB)
db = db.getSiblingDB("credibot_credit");
db.createCollection("credit_analyses");
db.credit_analyses.createIndex({ loanId: 1 }, { unique: true });
db.credit_analyses.createIndex({ customerId: 1, createdAt: -1 });
