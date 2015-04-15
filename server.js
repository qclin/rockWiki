var express = require('express'); 
var ejs = require('ejs');
var sqlite3 = require('sqlite3').verbose();
var bodyParser = require('body-parser');
var methodOverride = require('method-Override'); 

var app = express(); 
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:false})); 
app.use(methodOverride('_mehtod')); 

var db = new sqlite3.Database('./db/wiki.db'); 

app.get('/', function(req,res){
	db.all("SELECT * FROM documents;", function(err, rows){
		if(err){ throw err; }
		res.render('index.ejs', {documents:rows});
	});
});

// redirecting search to document page 
app.get('/documents/search', function(req, res){
	db.get("SELECT id FROM documents WHERE title = ?", req.body.title, function (err, data){
		if(err){throw err;}
		res.redirect('/documents/' + data);
	});
});

// render list of wiki documents 
app.get('/documents', function(req, res){
	db.all("SELECT * FROM documents;", function(err, rows){
		if(err){throw err;}
			res.render('doc_index.ejs', {documents:rows});
	});
});
// create new document, passing user info for author selections
app.get('/documents/new', function(req, res){
	
	db.get("SELECT * FROM users;", function(err, rows){
		if(err){ throw err; }else{res.render("doc_new.ejs");}
	});
});

// show the individual document 
app.get("/documents/:id",function(req,res){
	var docID = parseInt(req.params.id); 
	db.get("SELECT * FROM documents WHERE id = ?", docID, function(err, row){
		if(err){ throw err; }
		db.get("SELECT users.name, users.location FROM users INNER JOIN documents ON users.id = documents.author_id WHERE documents.author_id =" + row.author_id, function(err, data){
			console.log(data);
			res.render('doc_show.ejs', {document:row, author:data});
		});
	});
});
	
//posting a new documents with filled content 
app.post('/documents',function(req,res){
	//this is where you would make any api request to insert in db
	db.run("INSERT INTO documents (title, content, author_id) VALUES (?,?,?)", req.body.title, req.body.content, req.body.author, function(err){
		if(err){throw err; }
		res.redirect('/documents') /// too tireed . . . .
	});

});
// rendering list of existing users 
app.get('/users',function(req,res){
	db.all("SELECT * FROM users;", function(err,rows){
		if(err){ throw err; }
		res.render('user_index.ejs', {users:rows});
	});
});

// creating a new user 
app.get('/users/new',function(req,res){
	res.render("user_new.ejs");
});

// show user profile 
app.get("/users/:id", function(req,res){
	var userID = parseInt(req.params.id); 
	db.get("SELECT * FROM users WHERE id = ?", userID, function(err, row){
		if(err){ throw err; }
		db.all("SELECT document_id FROM contribution INNER JOIN users ON contribution.user_id = users.id WHERE users.id = " +userID, function(err, data){
			if(err){ throw err; }
			db.all("SELECT document_id FROM subscription INNER JOIN users ON subscription.user_id = users.id WHERE users.id = " +userID, function(err, info){
					if(err){ throw err; }
				res.render('user_show.ejs', {user:row, contribution: data, subscription: info}); 
			});
		});
	});
});

// adding a new user to the deck 
app.post('/users',function(req,res){
	/// special elements of request 
	db.run("INSERT INTO users (name, location, email_address) VALUES (?,?,?)", req.body.name, req.body.location, req.body.email_address, function(err){
		if(err){throw err; }
		res.redirect('/users');
	});
});

//rendering contribution history log 
// app.get('/documents/:docID/contributions', function(req,res){
// 	var docID = parseInt(req.params.id);
// 	db.all("SELECT * FROM contribution WHERE document_id =?", docID, function(err,data){
// 			if(err){ throw err; }
// 			res.render('contribution.ejs', {contribution: data});
// 		});
// });


app.listen(3000, function(){
	console.log("listening on" +3000);
});

