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
		const data0 = await con.execute(
			`
			SELECT COUNT(*) AS data_size FROM chp_key UNION SELECT COUNT(*) AS data_size FROM chp_person
			`
		);
		const data1 = await con.execute(
			`
			WITH cellphone_usage AS (
			SELECT 
				EXTRACT(YEAR FROM chp_key.collision_date) as year,
				SUM(CASE WHEN pfx.cellphone_in_use = 1 AND i.injured_victims > 0 THEN 1 ELSE 0 END) as cellphone_injuries
			FROM chp_person_effects pfx
				JOIN chp_person p ON p.person_id = pfx.person_id
				JOIN chp_injury i ON i.case_id = p.case_id
				JOIN chp_key ON chp_key.case_id = p.case_id
			WHERE 
				pfx.cellphone_in_use = 1
				AND EXTRACT(YEAR FROM chp_key.collision_date) BETWEEN 2002 AND 2020
			GROUP BY  EXTRACT(YEAR FROM chp_key.collision_date)
			ORDER BY year ASC
			),
			cellphone_hands_free AS (
			SELECT
				COUNT(chp_person.person_id) AS cellphone_hands_free,
				EXTRACT(YEAR FROM chp_key.collision_date) AS year
			FROM chp_person_effects
			JOIN chp_person ON chp_person_effects.person_id = chp_person.person_id
			JOIN chp_key ON chp_person.case_id = chp_key.case_id
			JOIN chp_injury ON chp_key.case_id = chp_injury.case_id
			WHERE
				cellphone_use_type = 'cellphone in use (hands-free)'
				AND EXTRACT(YEAR FROM chp_key.collision_date) BETWEEN 2002 AND 2020
				AND chp_injury.injured_victims > 0
			GROUP BY EXTRACT(YEAR FROM chp_key.collision_date)
			ORDER BY EXTRACT(YEAR FROM chp_key.collision_date)
			)
			SELECT
				cellphone_usage.year,
				cellphone_usage.cellphone_injuries, 
				cellphone_hands_free.cellphone_hands_free
			FROM cellphone_usage
			JOIN cellphone_hands_free
				ON cellphone_usage.year = cellphone_hands_free.year
			`
		);
		const data2 = await con.execute(
			`
			WITH kill AS(
				SELECT COUNT(*) AS kill, vehicle_make FROM chp_death
				JOIN chp_vehicle_table ON chp_death.case_id = chp_vehicle_table.case_id
				JOIN chp_vehicle_info ON chp_vehicle_table.vehicle_id = chp_vehicle_info.vehicle_id
				WHERE killed_victims > 0
				GROUP BY vehicle_make
				ORDER BY COUNT(*) DESC),
			nokill AS(
				SELECT COUNT(*) AS nokill, vehicle_make FROM chp_death
				JOIN chp_vehicle_table ON chp_death.case_id = chp_vehicle_table.case_id
				JOIN chp_vehicle_info ON chp_vehicle_table.vehicle_id = chp_vehicle_info.vehicle_id
				WHERE killed_victims = 0
				GROUP BY vehicle_make
				ORDER BY COUNT(*) DESC)
			SELECT
				kill.vehicle_make AS age,
				ROUND(kill.kill/nokill.nokill,4) AS average
			FROM kill
				JOIN nokill ON kill.vehicle_make = nokill.vehicle_make
			WHERE nokill >= 100
			ORDER BY average ASC
			`
		);
		const data3 = await con.execute(
			`
			SELECT
				SUM(chp_death.killed_victims) AS deaths,
				SUM(chp_death.pedestrian_killed_count) AS pedestrian,
				SUM(chp_death.bicyclist_killed_count) AS bicyclist,
				SUM(chp_death.motorcyclist_killed_count) AS motorcyclist,
				EXTRACT(YEAR FROM chp_key.collision_date) AS getyear
			FROM chp_person_effects
			JOIN chp_person ON chp_person_effects.person_id = chp_person.person_id
			JOIN chp_death ON chp_person.case_id = chp_death.case_id AND killed_victims > 0
			JOIN chp_key ON chp_death.case_id = chp_key.case_id
			WHERE sobriety != 'had not been drinking'
				AND sobriety != 'not applicable'
				AND sobriety != 'impairment unknown'
				AND EXTRACT(YEAR FROM chp_key.collision_date) != 2001
			GROUP BY EXTRACT(YEAR FROM chp_key.collision_date)
			ORDER BY EXTRACT(YEAR FROM chp_key.collision_date) ASC
			`
		);
		const data4 = await con.execute(
			`
			WITH deaths AS (
				SELECT (EXTRACT(YEAR FROM chp_key.collision_date) - vehicle_year) AS age_group, COUNT(DISTINCT chp_person.person_id) AS fatality_count
				FROM chp_vehicle_info
				JOIN chp_vehicle_table ON chp_vehicle_info.vehicle_id = chp_vehicle_table.vehicle_id
				JOIN chp_person ON chp_vehicle_table.case_id = chp_person.case_id AND chp_vehicle_table.person_id = chp_person.person_id
				JOIN chp_key ON chp_person.case_id = chp_key.case_id
				JOIN chp_death ON chp_person.case_id = chp_death.case_id
				WHERE 
					(chp_death.killed_victims > 0)
					AND (vehicle_year IS NOT NULL)
					AND (vehicle_year != '0')
					AND (EXTRACT(YEAR FROM chp_key.collision_date) IS NOT NULL)
				GROUP BY (EXTRACT(YEAR FROM chp_key.collision_date) - vehicle_year)
				ORDER BY age_group
				),
			total AS (
				SELECT (EXTRACT(YEAR FROM chp_key.collision_date) - vehicle_year) AS age_group, COUNT(DISTINCT chp_person.person_id) AS total_count
				FROM chp_vehicle_info
				JOIN chp_vehicle_table ON chp_vehicle_info.vehicle_id = chp_vehicle_table.vehicle_id
				JOIN chp_person ON chp_vehicle_table.case_id = chp_person.case_id AND chp_vehicle_table.person_id = chp_person.person_id
				JOIN chp_key ON chp_person.case_id = chp_key.case_id
				WHERE 
					(vehicle_year IS NOT NULL)
					AND (vehicle_year != '0')
					AND (EXTRACT(YEAR FROM chp_key.collision_date) IS NOT NULL)
				GROUP BY (EXTRACT(YEAR FROM chp_key.collision_date) - vehicle_year)
				ORDER BY age_group
				)
			SELECT
				deaths.age_group,
				ROUND(deaths.fatality_count/total.total_count, 4) AS ratio
			FROM deaths
				JOIN total ON deaths.age_group = total.age_group AND total.age_group <= 50
			`
		);
		const data5 = await con.execute(
			`
			SELECT pcf_violation_category, SUM(severe_injury_count) AS total_severe_injuries
			FROM chp_violation_type 
			JOIN chp_injury ON chp_violation_type.case_id = chp_injury.case_id 
			GROUP BY pcf_violation_category 
			ORDER BY total_severe_injuries DESC
			`
		);
		const data6 = await con.execute(
			`
			WITH male AS(
			SELECT EXTRACT(YEAR FROM chp_key.collision_date) AS year, COUNT(*) AS fatality_count
			FROM chp_person
			JOIN chp_death ON chp_person.case_id = chp_death.case_id
			JOIN chp_key ON chp_person.case_id = chp_key.case_id
			WHERE 
				(chp_death.killed_victims > 0)
				AND chp_person.sex = 'male'
				and (EXTRACT(YEAR FROM chp_key.collision_date) > 2001)
			GROUP BY EXTRACT(YEAR FROM chp_key.collision_date)
			ORDER BY EXTRACT(YEAR FROM chp_key.collision_date) ASC
			),
			female AS (
			SELECT EXTRACT(YEAR FROM chp_key.collision_date) AS year, COUNT(*) AS fatality_count
			FROM chp_person
			JOIN chp_death ON chp_person.case_id = chp_death.case_id
			JOIN chp_key ON chp_person.case_id = chp_key.case_id
			WHERE 
				(chp_death.killed_victims > 0)
				AND chp_person.sex = 'female'
				and (EXTRACT(YEAR FROM chp_key.collision_date) > 2001)
			GROUP BY EXTRACT(YEAR FROM chp_key.collision_date)
			ORDER BY EXTRACT(YEAR FROM chp_key.collision_date) ASC
			)
			SELECT
				male.year,
				male.fatality_count AS male_deaths,
				female.fatality_count AS female_deaths
			FROM male
				JOIN female ON male.year = female.year
				
			`
		)
		const data7 = await con.execute(
			`
			WITH wet AS (
				SELECT FLOOR(chp_person.age/10)*10 AS age_group, COUNT(*) AS fatality_count
				FROM chp_person
				JOIN chp_death ON chp_person.case_id = chp_death.case_id
				JOIN chp_weather_info ON chp_person.case_id = chp_weather_info.case_id
				WHERE 
					SUBSTR(collision_time, 1, 1) < '6'
					AND SUBSTR(collision_time, 2, 1) = ':'
					AND CAST(SUBSTR(collision_time, 1, 1) AS INT) < 6
					AND (chp_death.killed_victims) > 0
					AND (chp_weather_info.road_surface = 'wet')
				GROUP BY FLOOR(chp_person.age/10)*10
				ORDER BY FLOOR(chp_person.age/10)*10 ASC
			), dry AS (
				SELECT FLOOR(chp_person.age/10)*10 AS age_group, COUNT(DISTINCT chp_person.case_id) AS fatality_count
				FROM chp_person
				INNER JOIN chp_death ON chp_person.case_id = chp_death.case_id
				JOIN chp_weather_info ON chp_person.case_id = chp_weather_info.case_id
				WHERE 
					SUBSTR(collision_time, 1, 1) < '6'
					AND SUBSTR(collision_time, 2, 1) = ':'
					AND CAST(SUBSTR(collision_time, 1, 1) AS INT) < 6
					AND (chp_death.killed_victims) > 0
					AND (chp_weather_info.road_surface = 'dry')
				GROUP BY FLOOR(chp_person.age/10)*10
				ORDER BY FLOOR(chp_person.age/10)*10 ASC
			)
			SELECT
				wet.age_group,
				wet.fatality_count AS wet_deaths,
				dry.fatality_count AS dry_deaths
			FROM wet JOIN dry ON wet.age_group = dry.age_group
			
			`
		);
		return [data0.rows, data1.rows, data2.rows, data3.rows, data4.rows, data5.rows, data6.rows, data7.rows];
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