const express = require("express");
const app = express();
const cors = require("cors");
const nodemailer = require('nodemailer');
const hbs = require("hbs");

// get the client
const mysql = require("mysql2");

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname + '/public'));

app.set("view engine", "hbs");

//send mail
let transoprter = nodemailer.createTransport({
  host: 'smtp.mail.ru',
  port: 465,
  secure: true,
  auth: {
    user: 'buh-platforma@mail.ru',
    pass: 'NiV8g9t7Rmr7q6zczh02',
    // user: 'justimaginesmth@mail.ru',
    // pass: 'wuN77vCgXWvZt2ww6cAh',
  },
});

// create the connection to database
const pool = mysql.createPool({
  host: "bwxuvu4arjkscv5lvpzw-mysql.services.clever-cloud.com",
  user: "ud76mymcks4qpr1x",
  database: "bwxuvu4arjkscv5lvpzw",
  password: "S8d35IbiFGCgj6GBjXG4",
  port: "3306",
});

const promisePool = pool.promise();

const description = [
  "Услуга ведения кадрового делопроизводства опытным спецалистом нашей компании. Включает в себя кадровое администрирование ваших работников с момента приема к вам в компанию до увольнения из нее.",
  "Обеспечение информацией участников хозяйственных связей, необходимой для принятия управленческих решений, а также органов, осуществляющих контроль за деятельностью субъекта хозяйствования.",
  "Позволяет проконтролировать расходование денежных средств, выданных сотрудникам, и оформить финансовые операции, подтверждающие расходы организации.",
  "Документальное оформление кассовых операций,проведение платежей,взаимодействие с банковскими структурами.",
  "Подготовка и сдача отчетности или декларации.",
];

const price = [
  ["От 500 руб. — ведение кадрового делопроизводства за работника в месяц"],
  ["От 1000 руб. — до 10 контрагентов"],
  ["от 500 руб. — до 10 операций"],
  ["От 1000 руб."],
  [
    "От 3000 руб. — подготовка и сдача отчетности с нулевыми показателями организации на УСН",
    "От 5000 руб. — подготовка и сдача отчетности с нулевыми показателями организации на УСН",
    "От 1000 руб. — подготовка и сдача отчетности ИП патент без работников",
    "От 500 руб. — сдача декларации с нулевыми показателями по системе ТКС разовая услуга",
    "От 1000 руб. — подготовка декларации 3-НДФЛ",
  ],
];



hbs.registerHelper("ifEquals", (arg1, arg2, options) => {
  if (arg2 === "primaryKey") {
    return (arg1 === options.data.root.primaryKey) ? options.fn(this) : options.inverse(this);
  }
  return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
})

hbs.registerHelper("ifMore", (arg1, arg2, options) => {
  return (arg1 > arg2) ? options.fn(this) : options.inverse(this);
})

//look inside object and get keys from it
//return like keyValue1,keyValue2
hbs.registerHelper("search", (arg1, arg2, options) => {
  // console.log(Object.keys(arg1).join(","));
  return Object.keys(arg1)
})

app.get("/", (req, res) => {
  res.redirect("/tablesName");
})

app.get("/getFirstCards", async (req, res) => {
  try {
    const [cards] = await promisePool.execute(
      "SELECT * FROM `Service` WHERE Id < (SELECT MAX(Id) FROM `Service`)"
    ); //that return us [{smth},{smth}]

    const respondObject = [];
    for (let i = 0; i < cards.length; i++) {

      const card = {
        title: cards[i].Service_name,
        description: description[i],
        price: [price[i].map((p) => p)], //foreach(var p in price) return p
      };

      respondObject.push(card);
    }

    res.status(200).send(respondObject);
  } catch (error) {
    console.log(error);
  }
});

app.get("/getServices", async (req, res) => {
  try {
    const [services] = await promisePool.execute("SELECT * FROM `Service`");

    const respondObject = [];
    for (let i = 0; i < services.length; i++) {
      const query =
        "SELECT * FROM `Subservice` WHERE Service_id = " + services[i].ID;

      const [subservice] = await promisePool.execute(query);

      const data = {
        title: services[i].Service_name,
        subservice: subservice.map((s) => {
          const obj = {
            name: s.Subservice_name,
            price: s.Subservice_price,
          };
          return obj;
        }),
      };

      respondObject.push(data);
    }

    res.status(200).send(respondObject);
  } catch (error) {
    console.log(error);
  }
});

app.post("/leaveOrder", async (req, res) => {
  try {
    const { name, email, idService } = req.body;
    const date = new Date().toISOString().slice(0, 19).replace('T', ' ').split(' ')[0];

    const [user] = await promisePool.execute(
      "SELECT * FROM `User` WHERE User_email = ?",
      [email]
    );

    const [services] = await promisePool.execute("SELECT * FROM `Service` WHERE ID = " + idService);

    transoprter.sendMail(
      {
        from: "Аутсорсинг бухуслуг<buh-platforma@mail.ru>",
        to: "buh-platforma@mail.ru",
        subject: "Заявка на услугу",
        text: `Имя клиента: ${name}\nУслуга: ${services[0].Service_name}\nПочта клиента: ${email}\nДата отправления заявки: ${date}`,
      },
    )

    if (user.length > 0) {
      if (idService) {
        const [service] = await promisePool.execute(
          "INSERT INTO `Request` (`User_id`, `Service_id_`) VALUES(?,?)",
          [user[0].ID, idService]
        );
      }
    } else {
      const [user] = await promisePool.execute(
        "INSERT INTO `User`(`User_name`, `User_email`, `User_requestDate`) VALUES (?,?,?)",
        [name, email, date]
      );

      if (idService) {
        const [service] = await promisePool.execute(
          "INSERT INTO `Request` (`User_id`, `Service_id_`) VALUES(?,?)",
          [user.insertId, idService]
        );
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.log(error);
  }
});


//template
const translateTableName = {
  'User': 'Пользователи',
  'Request': 'Заявки',
  'Service': 'Услуги',
  'Subservice': 'Тип услуги'
}
app.get("/tablesName", async (req, res) => {
  try {
    const [names] = await promisePool.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_SCHEMA = 'boeejsqyv4gxfs7gshhn'");

    for (let i = 0; i < names.length; i++) {

      names[i].TABLE_NAME = translateTableName[names[i].TABLE_NAME];
    }


    res.render("admin.hbs", {
      names: translateTableName,
    });
  } catch (error) {

  }
});

const usersTranslate = {
  "Почта": "User_email",
  "Номер пользователя": "ID",
  "Логин": "User_name",
  "Дата заявки": "User_requestDate"
}

const serviceTranslitiion = {
  "Номер типа услуги": "ID",
  "Название": "Service_name",
}

const orderTranslate = {
  "Номер заказа": "ID",
  "Номер услуги": "Service_id_",
  "Номер пользователя": "User_id",
}

const subserviceTranslitiion = {
  "Номер типа услуги": "ID",
  "Название": "Subservice_name",
  "Цена": "Subservice_price",
  "Номер услуги": "Service_id"
}

app.get("/tableColumns/:name", async (req, res) => {
  try {
    const { name } = req.params;

    let [columns] = await promisePool.execute("SELECT COLUMN_NAME, COLUMN_KEY, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ?", [name]);

    const [data] = await promisePool.execute("SELECT * FROM `" + name + "`");


    for (let i = 0; i < data.length; i++) {
      if (data[i]?.Image) {
        data[i].Image = "data:image/png;base64," + Buffer.from(data[i].Image).toString("base64")
      }
      if (data[i]?.User_requestDate) {

        const date = new Date(data[i].User_requestDate)
        const formatted = new Intl.DateTimeFormat('en-US').format(date).split("/").reverse().join("-");
        data[i].User_requestDate = formatted;
      }
    }



    let colum = columns.map((column) => column.COLUMN_NAME);

    switch (name) {
      case "User":
        colum = usersTranslate;
        for (let i = 0; i < columns.length; i++) {
          columns[i].COLUMN_NAME = Object.keys(usersTranslate).find(key => usersTranslate[key] === columns[i].COLUMN_NAME);
        }
        break;
      case "Service":
        colum = serviceTranslitiion;
        for (let i = 0; i < columns.length; i++) {
          columns[i].COLUMN_NAME = Object.keys(serviceTranslitiion).find(key => serviceTranslitiion[key] === columns[i].COLUMN_NAME);
        }
        break;
      case "Request":
        colum = orderTranslate;
        for (let i = 0; i < columns.length; i++) {
          columns[i].COLUMN_NAME = Object.keys(orderTranslate).find(key => orderTranslate[key] === columns[i].COLUMN_NAME);
        }
        break;
      case "Subservice":
        colum = subserviceTranslitiion;
        for (let i = 0; i < columns.length; i++) {
          columns[i].COLUMN_NAME = Object.keys(subserviceTranslitiion).find(key => subserviceTranslitiion[key] === columns[i].COLUMN_NAME);
        }
        break;
      default:
        break;
    }

    const primaryKey = columns.find((colum) => { if (colum.COLUMN_KEY === 'PRI') { return colum } }).COLUMN_NAME
    // console.log(colum);
    res.render("table.hbs", {
      columns: colum,
      columnsDataType: columns,
      data: data,
      tableName: name,
      primaryKey
    });
  } catch (error) {
    console.log(error);
  }
})

app.post("/tableAdd/:name", async (req, res) => {
  try {
    const { name } = req.params;

    let { data, columnsName } = req.body;

    switch (name) {
      case "User":
        for (let i = 0; i < columnsName.length; i++) {

          columnsName[i] = usersTranslate[columnsName[i]];
        }
        break;
      case "Service":
        for (let i = 0; i < columnsName.length; i++) {

          columnsName[i] = serviceTranslitiion[columnsName[i]];
        }
        break;
      case "Request":
        for (let i = 0; i < columnsName.length; i++) {

          columnsName[i] = orderTranslate[columnsName[i]];
        }
        break;
      case "Subservice":
        for (let i = 0; i < columnsName.length; i++) {

          columnsName[i] = subserviceTranslitiion[columnsName[i]];
        }
        break;
      default:
        break;
    }




    columnsName = columnsName.map((name) => "`" + name + "`");
    data = data.map((value) => `'${value}'`);

    let set = " ";

    let bufferValue;

    for (let i = 0; i < columnsName.length; i++) {
      if (i + 1 < columnsName.length) {
        if (columnsName[i] === "`Image`") {
          bufferValue = Buffer.from(data[i], "base64");
          set += `BINARY(:bufferValue)` + ",";
        } else {
          set += data[i] + ",";
        }
      } else {
        if (columnsName[i] === "`Image`") {
          bufferValue = Buffer.from(data[i], "base64");
          set += `BINARY(:bufferValue)`;
        } else {
          set += data[i];
        }
      }
    }


    const query =
      "INSERT INTO `" +
      name +
      "`(" +
      columnsName.join(",") +
      ") VALUES(" +
      set +
      ")";

    pool.getConnection((err, connection) => {
      connection.query(query, { bufferValue }, (err, respond, fields) => {
        console.log(err);
        if (!respond) {
          res.sendStatus(304);

        } else {
          res.sendStatus(200);
        }
        pool.releaseConnection(connection);
      });
    });

  } catch (error) {
    console.log(error);
  }
})

app.post("/tableChangeData/:name", async (req, res) => {
  try {
    const { name } = req.params;
    //field is primary key
    let { columnsName, data, field, id } = req.body;

    switch (name) {
      case "User":
        field = usersTranslate[field];
        for (let i = 0; i < columnsName.length; i++) {

          columnsName[i] = usersTranslate[columnsName[i]];
        }
        break;
      case "Service":
        field = serviceTranslitiion[field];

        for (let i = 0; i < columnsName.length; i++) {

          columnsName[i] = serviceTranslitiion[columnsName[i]];
        }
        break;
      case "Request":
        field = orderTranslate[field];

        for (let i = 0; i < columnsName.length; i++) {

          columnsName[i] = orderTranslate[columnsName[i]];
        }
        break;
      case "Subservice":
        field = subserviceTranslitiion[field];

        for (let i = 0; i < columnsName.length; i++) {

          columnsName[i] = subserviceTranslitiion[columnsName[i]];
        }
        break;
      default:
        break;
    }

    columnsName = columnsName.map((name) => "`" + name + "`");
    data = data.map((value) => `'${value}'`);

    let set = " SET ";

    let bufferValue;

    for (let i = 0; i < columnsName.length; i++) {
      if (i + 1 < columnsName.length) {
        if (columnsName[i] === "`Image`") {
          bufferValue = Buffer.from(data[i], "base64");
          set += columnsName[i] + "=" + `BINARY(:bufferValue)` + ",";
        } else {
          set += columnsName[i] + "=" + data[i] + ",";
        }
      } else {
        if (columnsName[i] === "`Image`") {
          bufferValue = Buffer.from(data[i], "base64");
          set += columnsName[i] + "=" + `BINARY(:bufferValue)`;
        } else {
          set += columnsName[i] + "=" + data[i];
        }
      }
    }

    const query =
      "UPDATE `" +
      name + "`" +
      set +
      " WHERE " +
      "`" +
      `${field}` +
      "`" +
      "=" +
      `'${id}'`;
    pool.getConnection((err, connection) => {
      connection.query(query, { bufferValue }, (err, respond, fields) => {
        if (err) throw err;
        if (respond.affectedRows === 0) {
          res.sendStatus(404)
        } else {
          res.sendStatus(200);
        }
        pool.releaseConnection(connection);
      });
    });

  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

app.post("/tableDeleteData/:name", async (req, res) => {
  try {
    const { name } = req.params;
    //field is primary key
    let { field, id } = req.body;

    switch (name) {
      case "User":
        field = usersTranslate[field];

        break;
      case "Service":
        field = serviceTranslitiion[field];

        break;
      case "Request":
        field = orderTranslate[field];
        break;
      case "Subservice":
        field = subserviceTranslitiion[field];
        break;
      default:
        break;
    }

    const query =
      "DELETE FROM `" +
      name +
      "` WHERE " +
      "`" +
      `${field}` +
      "`" +
      "=" +
      `${id}`;
    pool.getConnection((err, connection) => {
      connection.query(query, (err, respond, fields) => {
        if (err) {
          // console.log(err);
          res.sendStatus(304);
        } else {
          res.sendStatus(200);
        }
        pool.releaseConnection(connection);
      });
    });

  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

app.listen(4000, () => {
  console.log("Server is waiting");
});