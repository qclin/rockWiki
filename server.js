var express = require('express'); 
var ejs = require('ejs');
var sqlite3 = require('sqlite3').verbose();
var bodyParser = require('body-parser');
var methodOverride = require('method-override'); 
var request = require ('request');
var secrets = require('./secrets.json');
var marked = require('marked');
marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: true,
  smartLists: true,
  smartypants: false
});
var sendgrid  = require('sendgrid')(secrets['user'], secrets['sendgridkey']);
require('colors')
var jsdiff = require('diff');
var app = express(); 
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:false})); 
app.use(methodOverride('_method')); 
app.use(express.static(__dirname+"/public"));

var db = new sqlite3.Database('./db/wiki.db'); 

app.get('/', function(req,res){
	// all data involved with recent activities
	db.all("SELECT * FROM activity LEFT OUTER JOIN users ON users.ID = activity.user_id LEFT OUTER JOIN documents ON documents.id = activity.document_id WHERE activity.updated_at >= datetime('now','-1 day') ORDER BY activity.updated_at DESC;", function(err, all){
		if(err){ throw err; }
		res.render('index.ejs', {act:all});
	});
	// all recent activity without addition fluff 
	db.all("SELECT * FROM activity WHERE updated_at >= datetime('now','-1 day') ORDER BY updated_at DESC;", function(err, info){
		if(err){ throw err; }
	});
});

// redirecting search to document page 
app.get('/documents/search', function(req, res){
	// regular expression need to remove excess space 
	db.get("SELECT id FROM documents WHERE title = ? ",req.query.title.toUpperCase(), function (err, data){
		if(err){throw err;}
		res.redirect('/documents/' + data.id);
	});
});
// redirect search key to a page with a list of articles 
app.get('/documents/searchkey', function(req, res){
	// regular expression need to remove excess space 
	db.all("SELECT * FROM documents WHERE content LIKE '%"+ req.query.key+"%' OR title LIKE '%"+ req.query.key+"%'", function (err, data){
		if(err){throw err;}
		// if nothing is found 
		request('http://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag=corgi', function(err, response, body){if(err){ throw err; }
			var giphy = JSON.parse(body).data.image_url; 
		res.render('search.ejs', {search:data, notfound:giphy});
		});
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
	if( isNaN(docID)) {
		res.redirect('/*'); //redirect to LSP 
		//res.redirect('/documents'); 
	} else {
		db.get("SELECT * FROM documents WHERE id = ?", docID, function(err, row){
			if(err){ throw err; }
			var markedBody = marked(row.content);
			db.get("SELECT users.id, users.name, users.location FROM users INNER JOIN documents ON users.id = documents.author_id WHERE documents.author_id =" + row.author_id, function(err, data){
				res.render('doc_show.ejs', {document:row, author:data, markedContent: markedBody});
			});
		});
	}
});
	
//posting a new documents with filled content 
app.post('/documents',function(req,res){
	//this is where you would make any api request to insert in db
	db.run("INSERT INTO documents (title, content, author_id, image, tags) VALUES (?,?,?,?,?)", req.body.title.toUpperCase(), req.body.content, req.body.author, req.body.image, req.body.tags, function(err){
		if(err){throw err; }
		res.redirect('/documents') /// too tired . . . 
		//logging activity into recent log 
		db.run("INSERT INTO activity (document_id, user_id, event) VALUES (?,?,?)", this.lastID, req.body.author, "created",function(err){
			if (err){throw err;}
		});
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

	// var chunk = req.body.content.charAT(/[[/w*/]]);
	// db.get('SELECT * FROM documents WHERE title LIKE ', %[[ ]]% )
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	// sendgrid FIRE ~~!!! 
	var email = new sendgrid.Email({from:'admin@wikiRocks.com'});
	email.subject = req.body.title + " has been updated ";
	db.get("SELECT email_address FROM users INNER JOIN documents ON users.id = documents.author_id WHERE documents.id = ?", docID, function(err,author){ if(err){ throw err; }
		email.to = author.email_address
	
		db.all("SELECT email_address FROM users INNER JOIN subscription ON users.id = subscription.user_id WHERE subscription.document_id = ? ", docID, function(err,subscribers){ if(err){ throw err; }
			email.bcc = [];	
			for(var i = 0; i< subscribers.length; i++){
				email.bcc.push(subscribers[i].email_address);
			}
			db.get("SELECT * FROM users WHERE id = ?", userID, function(err, editor){ if(err){ throw err; }
				email.text = editor.name + " of " + editor.location + " made the following changes: " + req.body.edit_summary

				sendgrid.send(email, function(err, json) {
  						if (err) { return console.error(err); }
  						console.log(json);
				});
			});
		});
	});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////	
	//// jsdiff 
	db.get("SELECT * FROM documents where id = ?", docID, function(err, oldDoc){
		if(err){ throw err; }
		var diff = jsdiff.diffChars(oldDoc.content, req.body.content);
		var jdiff = JSON.stringify(diff);
		db.run("INSERT INTO diff (document_id, user_id, edit_summary, diff_content) VALUES (?,?,?,?)", docID, userID,req.body.edit_summary, jdiff, function(err){
			if(err){ throw err; }
			console.log('stored');
		});
	});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////	

	// if requested any content, here would run request again for updates 
	db.run("UPDATE documents SET title = ?, content = ?, image = ?, tags = ? WHERE id = ?", req.body.title.toUpperCase(), req.body.content, req.body.image, req.body.tags, docID, function(err){
		if(err){ throw err; }
		/// essentially the same content expands with a diff table 
		db.run("INSERT INTO contribution (document_id, user_id, edit_summary) VALUES(?,?,?)", docID, userID, req.body.edit_summary, function(err){ 
			if(err){ throw err; }
			res.redirect('/documents/' + docID);
		});
	});
	//logging activity into recent log 
	db.run("INSERT INTO activity (document_id, user_id, event) VALUES (?,?,?)", docID, userID, "contributed",function(err){
		if (err){throw err;}
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
		//logging activity into recent log 
		db.run("INSERT INTO activity (user_id, event) VALUES (?,?)", this.lastID, "registered",function(err){
			if (err){throw err;}
		});
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
		// totally viable 
		db.run("DELETE FROM subscription WHERE user_id = ? AND document_id = ? ", userID, docID, function(err){ 
			if(err){ throw err; }
			res.redirect('/users/' + userID);
		});
	});
	//logging activity into recent log 
	db.run("INSERT INTO activity (user_id, event) VALUES (?,?)", userID, "updated",function(err){
		if (err){throw err;}
	});
});

// rendering contribution history log 
app.get('/documents/:docID/contributions', function(req,res){
	var docID = parseInt(req.params.docID);
	db.all("SELECT * FROM contribution INNER JOIN users ON users.id = contribution.user_id WHERE contribution.document_id = ? ORDER BY updated_at DESC", docID, function(err,data){
		if(err){ throw err; }
		db.all("SELECT * FROM diff INNER JOIN users ON users.id = diff.user_id WHERE diff.document_id = ? ORDER BY updated_at DESC", docID, function(err,rows){
			if(err){console.log(err);}
			//JSON.parse(rows);
			console.log(rows); /// a array of objects with diff_content still an json object 
			res.render('contributions.ejs', {contribution:data, diff:rows});
		});
	});
});
/// rendering individual diff pages
app.get('/documents/:docID/contributions/:diffID', function(req,res){
	console.log("here");
	var docID = parseInt(req.params.docID);
	var diffID = parseInt(req.params.diffID);
	db.get('SELECT * FROM documents WHERE id =?', docID, function(err,row){
		if(err){ throw err; }
		db.get('SELECT * FROM diff WHERE diff_id =?', diffID, function(err, data){
			if(err){ throw err; }
			res.render("diff.ejs", { doc:row, diff:data});
		});
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
		request('http://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag=yes', function(err, response, body){if(err){ throw err; }
		var giphy = JSON.parse(body).data.image_url; 
		res.render('subscribe.ejs', {document: row, users:notsubscribed, giphy:giphy});
		});
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
	//logging activity into recent log 
	db.run("INSERT INTO activity (document_id, user_id, event) VALUES (?,?,?)", docID, req.body.user, "subscribed",function(err){
		if (err){throw err;}
	});
}); 

//rendering a talk page for article 
app.get('/documents/:docID/talk', function(req, res){
	var docID = parseInt(req.params.docID);
	db.get("SELECT * FROM documents WHERE id = ?", docID, function(err, doc){
		if(err){ throw err; }
		// inner join talk with user 
		db.all("SELECT * FROM users", function(err,users){
			if(err){ throw err; }
			db.all("SELECT * FROM talk INNER JOIN users ON talk.user_id = users.id WHERE document_id = ?", docID, function (err, talks){
				if(err){ throw err; }
				res.render('talk.ejs', {doc: doc, users:users, talks: talks});
			});
		});
	});
});

// posting parent comments into talk 
app.post('/documents/:docID/talk/start', function(req,res){
	var docID = parseInt(req.params.docID); 
	db.run("INSERT INTO talk (document_id, user_id, note) VALUES (?,?,?)", docID, req.body.user, req.body.note, function(err){ if(err){ throw err ;}
		res.redirect('/documents/'+docID+"/talk");
	});
	//logging activity into recent log 
	db.run("INSERT INTO activity (document_id, user_id, event) VALUES (?,?,?)", docID, req.body.user, "talked",function(err){
		if (err){throw err;}
	});
});


// rendering a reply to current talk 
app.get('/documents/:docID/talk/:talkID/new', function(req,res){
	var docID = parseInt(req.params.docID);
	var talkID = parseInt(req.params.talkID);
	db.get('SELECT * FROM documents WHERE id = ?', docID, function(err, doc){

		db.get('SELECT * FROM talk INNER JOIN users ON talk.user_id = users.id WHERE talk.talk_id = ?', talkID, function(err, data){ 
			if(err){ console.log(err);}
			db.all("SELECT * FROM users;", function(err, rows){
				if(err){ throw err; }
				res.render("talk_new.ejs", {doc: doc, talk:data, users:rows});
			});
		});
	});
});

// posting child comment into talk 
/// works but diplay is still uniform . . . maybe css styling  will give needed indentation 
app.post('/documents/:docID/talk/:talkID/talk', function(req,res){
	var docID = parseInt(req.params.docID); 
	var parentID = parseInt(req.params.talkID);
	db.run("INSERT INTO talk (document_id, user_id, note, parent_id) VALUES (?,?,?,?)", docID, req.body.talker, req.body.note, parentID, function(err){ if(err){ throw err ;}
		res.redirect('/documents/'+docID+"/talk");
	});
});

// render edit page for document update / 
app.get('/documents/:docID/talk/:talkID/edit',function(req,res){
	var docID = parseInt(req.params.docID);
	var talkID = parseInt(req.params.talkID);
	db.get("SELECT * FROM documents WHERE id = ?", docID, function (err,data){
		if(err){ throw err; }
	db.get("SELECT * FROM talk INNER JOIN users ON talk.user_id = users.id WHERE talk_id = ?", talkID, function(err, row){
		if(err){ throw err; }
		res.render('talk_edit.ejs', {talk:row, document:data});
		});
	});
});

// update comments 

app.put('/documents/:docId/talk/:talkId', function(req,res){
	var docID = parseInt(req.params.docId);
	var talkID = parseInt(req.params.talkId);
	db.run("UPDATE talk SET note = ? WHERE talk_id = ?", req.body.note, talkID, function(err){
		if(err){
			throw err; 
		}
				res.redirect('/documents/'+ docID + '/talk');
	});
});

// deleting a document 
app.delete('/documents/:id', function(req,res){
	var docID = parseInt(req.params.id); 
	db.run('DELETE FROM documents WHERE id = ?', docID, function(err){
		console.log(err);
		res.redirect('/documents');
	});
	//logging activity into recent log 
	db.run("INSERT INTO activity (document_id, event) VALUES (?,?)", docID, "deleted",function(err){
		if (err){throw err;}
	});
});

//deleting a user 
app.delete('/users/:id', function(req, res){
	var userID = parseInt(req.params.id);
	db.run('DELETE FROM users WHERE id ='+ userID, function(err){
		res.redirect('/users');
	});
	//logging activity into recent log 
	db.run("INSERT INTO activity (user_id, event) VALUES (?,?)", userID, "deleted",function(err){
		if (err){throw err;}
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
		request('http://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag=flip+table', function(err, response, body){if(err){ throw err; }
		var giphy = JSON.parse(body).data.image_url; 
		res.render('unsubscribe.ejs', {document: row, users:subscribed, giphy:giphy});
		});
		});
	});
});



//unsubscribing 
app.delete('/documents/:id/unsubscribe', function(req,res){
	var docID = parseInt(req.params.id);
	var userID= req.body.user
	db.run('DELETE FROM subscription WHERE user_id ='+ userID, function(err){
		res.redirect('/documents/'+docID);
	});
	//logging activity into recent log 
	db.run("INSERT INTO activity (document_id, user_id, event) VALUES (?,?,?)", docID, userID, "unsubscribed",function(err){
		if (err){throw err;}
	});
});

// error handling for all other routes // send Lumpy Space Princess 
app.get('*', function(req,res){
	request('http://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag=lumpy+space+princess', function(err, response, body){if(err){ throw err; }
		var giphy = JSON.parse(body).data.image_url; 
	res.render("error.ejs",{giphy:giphy});
	//res.send(400); 
	});
});

app.listen(secrets['port'], function(){
	console.log("listening on " + secrets['port']);
});




