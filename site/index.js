// 'npm run devStart' in console to run
// runs on localhost:3000
// requires installation of oracledb, express, nodemon, ejs
// also chart.js
// I also installed Oracle XE 21 and had to set ORACLE_HOME & other environment variables

// oracle setup
const oracledb = require('oracledb');
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

// express setup
const express = require('express')
const app = express()

async function database_get() {
	let con;
	try {
		con = await oracledb.getConnection({
			user :          "urnseay.jlindsey",
			password :      "JNr0t4tK7tiY21aHXEKkivb5",
			connectString : "(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=oracle.cise.ufl.edu)(PORT=1521))(CONNECT_DATA=(SID=orcl)))"
		});
		const data = await con.execute(
			'SELECT * FROM COUNTRY WHERE ROWNUM <= 5',
		);
		//console.log(data);
		return data.rows;
	} catch (err) {
		console.error(err);
	}
}

app.use(express.static(__dirname + '/public'));

app.set('view engine', 'ejs')
app.get('/', (request, response) => {
	// fetches the data, then sends it to be rendered
	// renders index.ejs
	database_get()
	.then(function(data) {
		response.render('index', {mydata: data})
	})
})

app.listen(3000)