var express = require('express'); 
var ejs = require('ejs');
var sqlite3 = require('sqlite3').verbose();
var bodyParser = require('body-parser');
var methodOverride = require('method-Override'); 

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
	db.get("SELECT id FROM documents WHERE title = ?", req.query.title, function (err, data){
		if(err){throw err;}
		res.redirect('/documents/' + data.id);
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
	db.run("INSERT INTO documents (title, content, author_id) VALUES (?,?,?)", req.body.title, req.body.content, req.body.author, function(err){
		if(err){throw err; }
		res.redirect('/documents') /// too tireed . . . .
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
	/// if requested any content, here would run request again for updates 
	db.run("UPDATE documents SET title = ?, content = ?, image = ?, tags = ? WHERE id = ?", req.body.title, req.body.content, req.body.image, req.body.tags, docID, function(err){
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

// rendering contribution history log 
app.get('/documents/:docID/contributions', function(req,res){
	var docID = parseInt(req.params.docID);
	db.all("SELECT * FROM contribution INNER JOIN users ON users.id = contribution.user_id WHERE contribution.document_id = ?", docID, function(err,data){
		if(err){ throw err; }
		res.render('contributions.ejs', {contribution:data});
	});
});

//rendering a subscription page 
app.get('/documents/:docID/subscribe',function(req, res){
	var docID = parseInt(req.params.docID);
	db.get("SELECT * FROM documents WHERE id = ?", docID, function(err, row){
		if(err){ throw err; }
		// search subscription to see who's subscribe 
		db.all("SELECT users.id, users.name FROM users INNER JOIN subscription ON users.id = subscription.user_id WHERE subscription.document_id = " +docID, function(err, subscribed){
				if(err){ throw err; }
				console.log(subscribed);
						//[ { id: 1, name: 'qatar Lion' },{ id: 3, name: 'gretchen' },{ id: 2, name: 'aung barto ' } ]
		
		//db.all("SELECT user_id FROM subscription WHERE document_id = ?", docID, function(err, info){
			//  [ { user_id: 1 }, { user_id: 3 }, { user_id: 2 } ]

			// how to find who's not on the subscription list 
			db.all("SELECT users.id, users.name FROM users INNER JOIN subscription ON users.id != subscription.user_id WHERE subscription.document_id = " +docID, function(err, notsubscribed){
				if(err){ throw err; }
				console.log(notsubscribed);
			});
			


			// then pass in people who haven't subscribed 
			db.all("SELECT users.id, users.name FROM users WHERE user.id = ?", subscribed, function(err, data){
			res.render('subscripe.ejs', {document:row, users:data});
			});
		});
		
	});
});
// inserting into subscription table user/document data

app.post('/documents/:docID', function(req, res){ 
	var docID = parseInt(req.params.docID);
	db.get("SELECT * FROM subscription WHERE subscription.user_id = ? AND subscription.document_id = ?", req.body.user, docID, function(err,row){
		if(err){ throw err; }
		console.log(row);
	if(row === undefined){
		db.run("INSERT INTO subscription (document_id, user_id) VALUES(?,?)", docID, req.body.user, function(err){
			if(err){ throw err; }
			res.redirect('/documents/'+ docID);
		});
	}else{ 
		res.redirect('/documents/'+ docID); }
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

// //unsubscribing 
// app.delete('/documents/:id/subscribe', function(req,res){
// 	db.run('DELETE FROM subscription WHERE user_id ='+parseInt(req.body.user), function(err){
// 		res.redirect('/documents/:id');

// 	});
// });

app.listen(3000, function(){
	console.log("listening on" +3000);
});

 

