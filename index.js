const express = require('express')
const app = express()
const path = require('path')
const mysql = require('mysql2')
const moment = require('moment')
const SerialPort = require('serialport');
var localStorage = require('localStorage')

const arduino_port = new SerialPort('com5', function (err) {
  if (err) {
    return console.log('Error: ', err.message)
  }
})

const Readline = require('@serialport/parser-readline');
const parser = arduino_port.pipe(new Readline())

arduino_port.on('open', function () {
  console.log('open serial communication');

})

arduino_port.write('main screen turn on', function (err) {
  if (err) {
    return console.log('Error on write: ', err.message)
  }
  console.log('message written')
})

const connection = mysql.createConnection({
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'agee04041**',   // 자신의 mysql 비밀번호로 설정
  database: 'factory' // factory 라는 이름의 db 새로 생성
})

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, '/public')))



//routing

app.get('/', (req, res) => {
  res.status(200).render('main')
})

app.get('/tempAndHumi', (req, res) => {
  res.render('tempAndHumi')
})

app.get('/preventFlame', (req, res) => {
  res.render('preventFlame')
})

app.get('/tempHumi', (req, res) => {
  connection.query(
    `select * from th_sensor`,
    function (err, result) {
      if (err) {
        console.log(err)
        res.json({
          data: err
        })
      } else {
        res.json({
          result: result
        })
      }
    }
  )
})

app.get('/flame', (req, res) => {
  connection.query(
    `select * from flame_sensor`,
    function (err, result) {
      if (err) {
        console.log(err)
        res.json({
          data: err
        })
      } else {
        res.json({
          result: result
        })
      }
    }
  )
})


// localStorage.clear();
if (localStorage.length <= 0) {
  localStorage.setItem('button1', 'OFF');
  sessionStorage.setItem('button2', 'OFF');
}


app.get('/datas/:id', function (req, res) {
  let id = req.params.id
  if (id == 1) {
    if (localStorage.getItem('button1') == 'ON') {
      localStorage.setItem('button1', 'OFF')
    } else if (localStorage.getItem('button1') == 'OFF') {
      localStorage.setItem('button1', 'ON')
    }
    console.log("button1: " + localStorage.getItem('button1'))
  } else if (id == 2) {
    if (localStorage.getItem('button2') == 'ON') {
      localStorage.setItem('button2', 'OFF')
    } else if (localStorage.getItem('button2') == 'OFF') {
      localStorage.setItem('button2', 'ON')
    }
    console.log("button2: " + localStorage.getItem('button2'))
  }

  if (localStorage.getItem('button1') == "ON" && localStorage.getItem('button2') == "ON") {
    parser.resume()
    parser.on('data', (line) => {
      let temp = Number(line.substr(11, 5))
      let humi = Number(line.substr(24, 5))
      let thi = Number(line.substr(32, 5))
      let thi_state = line.substr(46, 1)
      let flame = line.substr(52, 1)
      let date = moment().format('YYYY-MM-DD HH:mm:ss')

      connection.query(
        `insert into th_sensor (temp, humi, thi, thi_state, date) values (?, ?, ?, ?, ?)`,
        [temp, humi, thi, thi_state, date],
        function (err, result) {
          if (err) {
            console.log(err)
          } else {
            console.log(result)
          }
        }
      )
      connection.query(
        `insert into flame_sensor (flame, date) values (?, ?)`,
        [flame, date],
        function (err, result) {
          if (err) {
            console.log(err)
          } else {
            console.log(result)
          }
        }
      )
    })
  } else {
    parser.pause()
  }

  res.status(200).send('ok')
})


app.get('/controller/:id', function (req, res) {
  arduino_port.write(req.params.id);
  res.status(200).send('LED Controll OK!!');
})

const port = 5000
app.listen(port, function () {
  console.log(`서버 실행 중, 포트 번호: ${port}`)
})