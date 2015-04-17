var express = require('express'); 
var ejs = require('ejs');
var sqlite3 = require('sqlite3').verbose();
var bodyParser = require('body-parser');
var methodOverride = require('method-Override'); 
var marked = require('marked');

//trying sendgrid npm
var sendgrid  = require('sendgrid')("qclin", "wiki920lemon");

var app = express(); 
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:false})); 
app.use(methodOverride('_method')); 

var db = new sqlite3.Database('./db/wiki.db'); 

app.get('/', function(req,res){
	db.all("SELECT * FROM documents;", function(err, rows){
		if(err){ throw err; }
		res.render('index.ejs', {documents:rows});
	});
});

// redirecting search to document page 
app.get('/documents/search', function(req, res){
	db.get("SELECT id FROM documents WHERE title = ?", req.query.title.toUpperCase(), function (err, data){
		if(err){throw err;}
		res.redirect('/documents/' + data.id);
	});
});

// render pages base off of tags 
app.get('/tags/:type', function(req, res){
	var type = req.params.type
	db.all("SELECT * FROM documents WHERE tags = ?;", type, function(err, rows){
		if(err){ throw err; }
		res.render("tag_"+type+".ejs", {documents:rows}); 
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
	
	db.all("SELECT * FROM users;", function(err, rows){
		if(err){ throw err; }
		res.render("doc_new.ejs", {users:rows});
	});
});

// show the individual document 
app.get("/documents/:id",function(req,res){
	var docID = parseInt(req.params.id); 
	db.get("SELECT * FROM documents WHERE id = ?", docID, function(err, row){
		if(err){ throw err; }
		db.get("SELECT users.id, users.name, users.location FROM users INNER JOIN documents ON users.id = documents.author_id WHERE documents.author_id =" + row.author_id, function(err, data){
			res.render('doc_show.ejs', {document:row, author:data});
		});
	});
});
	
//posting a new documents with filled content 
app.post('/documents',function(req,res){
	//this is where you would make any api request to insert in db
	var markedBody = marked(req.body.content);
	db.run("INSERT INTO documents (title, content, author_id, image, tags) VALUES (?,?,?,?,?)", req.body.title.toUpperCase(), req.body.content, req.body.author, req.body.image, req.body.tags, function(err){
		if(err){throw err; }
		res.redirect('/documents') /// too tired . . . 
	});
});

// render edit page for document update / 
app.get('/documents/:id/edit',function(req,res){
	var docID = parseInt(req.params.id);
	db.get("SELECT * FROM documents where id = ?", docID, function(err, row){
		if(err){ throw err; }
		db.all("SELECT users.id, users.name FROM users", function(err, data){
		res.render('doc_edit.ejs', {document:row, users:data});
		});
	});
});

// update exiting page while inserting id into contribution table 
app.put("/documents/:id", function(req,res){
	var docID = parseInt(req.params.id);
	var userID = req.body.user;
	
	// // sendgrid FIRE ~~!!! 
	// var email = new sendgrid.Email({from:'admin@wikiRocks.com'});
	// email.subject = req.body.title + "has been updated";
	// db.get("SELECT email_address FROM users INNER JOIN documents ON users.id = documents.author_id WHERE documents.id = ?", docID, function(err,author){ if(err){ throw err; }
	// 	email.to = author.email_address
	
	// 	db.all("SELECT email_address FROM users INNER JOIN subscription ON users.id = subscription.user_id WHERE subscription.document_id = ? ", docID, function(err,subscribers){ if(err){ throw err; }
	// 		email.bcc = [];	
	// 		for(var i = 0; i< subscribers.length; i++){
	// 			email.bcc.push(subscribers[i].email_address);
	// 		}
	// 		db.get("SELECT * FROM users WHERE id = ?", userID, function(err, editor){ if(err){ throw err; }
	// 			console.log(editor);
	// 			email.text = editor.name + " of " + editor.location + " made the following changes " + req.body.edit_summary
	
	// 			sendgrid.send(email, function(err, json) {
 //  						if (err) { return console.error(err); }
 //  						console.log(json);
	// 			});
	// 		});
	// 	});
	// });

	/// if requested any content, here would run request again for updates 
	db.run("UPDATE documents SET title = ?, content = ?, image = ?, tags = ? WHERE id = ?", req.body.title.toUpperCase(), req.body.content, req.body.image, req.body.tags, docID, function(err){
		if(err){ throw err; }
		db.run("INSERT INTO contribution (document_id, user_id, edit_summary) VALUES(?,?,?)", docID, userID, req.body.edit_summary, function(err){ 
			if(err){ throw err; }
			res.redirect('/documents/' + docID);
		});
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
		db.all("SELECT documents.id, documents.title, documents.created_at FROM documents INNER JOIN users ON documents.author_id = users.id WHERE users.id = " +userID, function(err, authored){
			if(err){ throw err; }
			
			db.all("SELECT documents.id, documents.title FROM documents INNER JOIN contribution ON documents.id = contribution.document_id WHERE contribution.user_id = " +userID, function(err, contributed){
			
				if(err){ throw err; }
				db.all("SELECT documents.id, documents.title FROM documents INNER JOIN subscription ON documents.id = subscription.document_id WHERE subscription.user_id = " +userID, function(err, subscribed){
						if(err){ throw err; }
					res.render('user_show.ejs', {users:row, authorship:authored, contribution:contributed, subscription:subscribed}); 
				});
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

// render edit page for user update / 
app.get('/users/:id/edit',function(req,res){
	var userID = parseInt(req.params.id);
	db.get("SELECT * FROM users where id = ?", userID, function(err, row){
		if(err){ throw err; }
		db.all("SELECT documents.id, documents.title FROM documents INNER JOIN subscription ON documents.id = subscription.document_id WHERE subscription.user_id = " +userID, function(err, data){
			if(err){ throw err; }
		res.render('user_edit.ejs', {user:row, subscription:data});
		});
	});
});

// update user profile while deleting subscription table 
app.put("/users/:id", function(req,res){
	var userID = parseInt(req.params.id);
	var docID = req.body.doc;

	db.run("UPDATE users SET name = ?, location = ?, pitch = ?, email_address = ? WHERE id = ?", req.body.name, req.body.location, req.body.pitch, req.body.email_address, userID, function(err){
		if(err){ throw err; }
		// probably not viable 
		db.run("DELETE FROM subscription WHERE user_id = ? AND document_id = ? ", userID, docID, function(err){ 
			if(err){ throw err; }
			res.redirect('/users/' + userID);
		});
	});
});

// rendering contribution history log 
app.get('/documents/:docID/contributions', function(req,res){
	var docID = parseInt(req.params.docID);
	db.all("SELECT * FROM contribution INNER JOIN users ON users.id = contribution.user_id WHERE contribution.document_id = ? ORDER BY updated_at DESC", docID, function(err,data){
		if(err){ throw err; }
		res.render('contributions.ejs', {contribution:data});
	});
});

//rendering a subscription page 
app.get('/documents/:docID/subscribe',function(req, res){
	var docID = parseInt(req.params.docID);
		db.get("SELECT * FROM documents WHERE id = ? ", docID, function(err, row){
			if(err){ throw err; }
	// how to find who's not on the subscription list 
	db.all("SELECT users.id, users.name FROM users WHERE users.id NOT IN (SELECT user_id FROM subscription WHERE document_id = " +docID+")", function(err, notsubscribed){
		if(err){ throw err; }
		res.render('subscribe.ejs', {document: row, users:notsubscribed});
		});
	});
});

// inserting into subscription table user/document data
app.post('/documents/:docID', function(req, res){ 
	var docID = parseInt(req.params.docID);
	db.run("INSERT INTO subscription (document_id, user_id) VALUES(?,?)", docID, req.body.user, function(err){
		if(err){ throw err; }
		res.redirect('/documents/'+ docID);
	});
}); 

// deleting a document 
app.delete('/documents/:id', function(req,res){
	db.run('DELETE FROM documents WHERE id =' +parseInt(req.params.id), function(err){
		res.redirect('/documents');
	});
});

//deleting a user 
app.delete('/users/:id', function(req, res){
	db.run('DELETE FROM users WHERE id ='+parseInt(req.params.id), function(err){
		res.redirect('/users');
	});
});

//rendering a UN-subscription page 
app.get('/documents/:docID/unsubscribe',function(req, res){
	var docID = parseInt(req.params.docID);
		db.get("SELECT * FROM documents WHERE id = ? ", docID, function(err, row){
			if(err){ throw err; }
	// search subscription to see who's already subscribe 
		db.all("SELECT users.id, users.name FROM users INNER JOIN subscription ON users.id = subscription.user_id WHERE subscription.document_id = " +docID, function(err, subscribed){
				if(err){ throw err; }
		res.render('unsubscribe.ejs', {document: row, users:subscribed});
		});
	});
});

//unsubscribing 
app.delete('/documents/:id/unsubscribe', function(req,res){
	var docID = parseInt(req.params.id);
	db.run('DELETE FROM subscription WHERE user_id ='+parseInt(req.body.user), function(err){
		res.redirect('/documents/'+docID);
	});
});

app.listen(3000, function(){
	console.log("listening on" +3000);
});

 

