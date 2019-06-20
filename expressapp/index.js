var express = require("express");
var config = require('./config/config.json');
var app = express();
var router = express.Router();
var path = __dirname + '/views/';
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
	host: config.elasticsearch_ip + ":" + config.elasticsearch_ip_port,
	log: 'trace'
});

function getBirthdate(req){
	var returnValue = new Date(req.query.Birthdate);
	var month = returnValue.getMonth() + 1;
	return returnValue.getDate() + '-' + month;
}

function trimEmail(email){
return email.split('@')[0];
}

app.set('view engine', 'ejs');
app.use("/",router);
app.use(express.static('views'));

app.use("*",function(req,res){
	res.render(path + '404');
});

router.use(function (req,res,next) {
	console.log("/" + req.method);
	next();
});

router.get("/",function(req,res){
	res.render(path + 'index');
});

router.get("/add",function(req,res){
	res.render(path + 'addEmployee');
});

router.get("/remove",function(req,res){
	res.render(path + 'removeEmployee');
});

router.get("/search",function(req,res){
	res.render(path + 'searchEmployee');
});

router.get("/registerEmployee",function(req,res){
	client.ping({
		requestTimeout: 100
	}, function (error) {
		if (error) {
			res.render(path + 'elasticsearch-down');
		} else {
			var birthdate = getBirthdate(req);
			client.search({
				index: config.elasticsearch_index_name,
				type: config.elasticsearch_doc_type,
				body: {
					query: {
						bool: {
							must:[{
								match: {
									"name": req.query.employeeName
								}
							},{
								match: {
									"email": req.query.email
								}
							}]
						}
					}
				}
			}).then(function(resp) {
				if (resp.hits.total === 0) {
					client.index({
						index: config.elasticsearch_index_name,
						id: req.query.email,
						type: config.elasticsearch_doc_type,
						body: {
							"name": req.query.employeeName,
							"birthdate": birthdate,
							"email": req.query.email,
						}
					}, function(err, resp, status) {
						if (err) {
							console.log(error);
							res.render(path + '404');
						}
						else {
							res.render(path + 'addEmployeeSuccess',
							{
								employeeName : req.query.employeeName
							});
						}
					});
				}
				else{
					res.render(path + 'addEmployeeFailure',
					{
						employeeName : req.query.employeeName
					});
				}					
			}, function(err) {
				console.trace(err.message);
			})
		}
	})
});

router.get("/removeEmployee",function(req,res){
	client.ping({
		requestTimeout: 100
	}, function (error) {
		if (error) {
			res.render(path + 'elasticsearch-down');
		} else {
			if (req.query.email.length > 0) {
				var email = trimEmail(req.query.email);
				client.deleteByQuery({
					index: config.elasticsearch_index_name,
					type: config.elasticsearch_doc_type,
					body: {
						query: {
							match: { email: email }
						}
					}
				}, function (error, response) {
					if (error) {
						console.log(error);
					}
					else{
						if (response.total > 0) {
							res.render(path + 'removeEmployeeSuccess', 
							{ 
								employeeEmail : req.query.email
							});						
						}
						else{
							res.render(path + 'removeEmployeeFailure', 
							{ 
								employeeEmail : req.query.email
							});
						}
					}
				});
			}
		}
	})
});

router.get("/searchEmployee",function(req,res){
	client.ping({
		requestTimeout: 100
	}, function (error) {
		if (error) {
			res.render(path + 'elasticsearch-down');
		} else {
			if (req.query.employeename.length > 0) {
				var employeeName = req.query.employeename;
				client.search({
					index: config.elasticsearch_index_name,
					type: config.elasticsearch_doc_type,
					body: {
						query: {
							match: {
								"name": employeeName
							}
						}
					}
				}).then(function(resp) {
					console.log(resp);
					var employees = resp.hits.hits
					if (resp.hits.total > 0) {
						res.render(path + 'searchEmployeeSuccess' , 
						{
							employeeName : employeeName,
							employees : employees
						});
					}
					else{
						res.render(path + 'searchEmployeeFailure',
						{
							employeeName : employeeName
						});
					}
					
				}, function(err) {
					console.trace(err.message);
				});
			}
			else{
				res.render(path + '404');
			}}
		});
});

app.listen(config.server_port,function(){
	console.log("Live at Port: " + config.server_port);
});



