from flask import Flask, json, jsonify, request  # なぜかrequestsでは動かない。
from flask_cors import CORS
from flask_restful import Resource, Api
import sqlite3

app = Flask(__name__)
api = Api(app)
CORS(app)


@app.route("/db")
def db():
    my_db = sqlite3.connect("db/music.db")
    cursor = my_db.cursor()
    # cursor.execute(".table") ##query でないので実行できないようだ。
    cursor.execute("select * from sqlite_master where type='table'")
    # cursor.execute("select * from aaa")
    fetch_all = cursor.fetchall()
    cursor.close()
    return jsonify(fetch_all)


@app.route("/songs", methods=['GET'])
def get_songs():
    db_connection = sqlite3.connect("db/music.db")
    db_cursor = db_connection.cursor()
    # db_cursor.execute("select * from s")
    db_cursor.execute("select id,title,album,year,genre,created_at from s")  # without data & path
    fetch_all = db_cursor.fetchall()

    db_cursor.close()
    db_connection.commit()
    db_connection.close()
    return jsonify(fetch_all)


@app.route("/songs/<id>", methods=["GET"])
def get_song(id):
    my_db = sqlite3.connect("db/music.db")
    cursor = my_db.cursor()
    param = (id,)

    # cursor.execute("select * from s where id="+id) #everything
    # cursor.execute("select id,title,album,year,genre,created_at from s where id="+id)

    cursor.execute("select id,title,album,year,genre,created_at from s where id=?", param)

    fetch_all = cursor.fetchall()
    cursor.close()
    my_db.close()
    return jsonify(fetch_all)


@app.route("/songs", methods=["POST"])
def post_song():
    my_db = sqlite3.connect("db/music.db")
    cursor = my_db.cursor()

    param = ("title", "album", "year", "genre", "data", "created_at", "path")
    cursor.execute("""
    insert into
    s(title, album, year, genre, data, created_at, path)
    #values("title", "album", "year", "genre", "data", "created_at", "path");)
    values("?, ?, ?, ?, ?, ?, ?);"""", param)


    cursor.execute("""select * from s where id = (select max(id) from s);""")

    fetch_all = cursor.fetchall()
    cursor.close()
    my_db.commit() # changes will not be saved without commit
    my_db.close()

    return jsonify(fetch_all)




@app.route("/songs/<id>", methods=["DELETE"])
def delete_song(id):
    db_connection = sqlite3.connect("db/music.db")
    db_cursor = db_connection.cursor()
    param = (id,)

    try:
        # delete
        db_cursor.execute("delete from s where id = ?", param)

        # after delete
        db_cursor.execute("select id,title,album,year,genre,created_at from s")  # without data & path
        fetch_all = db_cursor.fetchall()
    except sqlite3.Error as e:
        print("sqlite3.Error: ", e.args[0])

    db_cursor.close()
    db_connection.commit()  # changes will not be saved without commit
    db_connection.close()

    return jsonify(fetch_all)


@app.route('/')
@app.route('/world')  # more routes can be defined
def hello_world():
    h = "Hello2"
    s = " 1"
    w = "World!1"
    # return "Hello World!"
    # return h+s+w
    return "index page"


@app.route("/hello/<name>")
def hello(name):
    return "hello" + name


@app.route("/hello2")
def hello2():
    return "hello world"


@app.route('/user/<username>')
def show_user_profile(username):
    # show the user profile for that user
    # pass
    return username


@app.route('/post/<int:post_id>')
def show_post(post_id):
    # show the post with the given id, the id is an integer
    # passS
    return str(post_id)


@app.route('/projects/')  # works like directories
def projects():
    return "/projects/"


@app.route('/about')  # works like files
def about():
    return "about"


@app.route('/login', methods=['POST', 'GET'])
def login():
    searchWord = request.args.get("param1", "")
    print(searchWord)
    error = None
    if request.method == 'POST':
        if valid_login(request.form['username'],
                       request.form['password']):
            return log_the_user_in(request.form['username'])
        else:
            error = 'Invalid username/password'
    # this is executed if the request method was GET or the
    # credentials were invalid


@app.route('/login2', methods=['POST', 'GET'])
def login2():
    searchWord = request.args.get("param1", "")
    print(searchWord)
    error = None
    if request.method == 'POST':
        username = request.form["username"]
        password = request.form["password"]
    new_entry = {
        "username": username,
        "password": password
    }
    entries.append(new_entry)
    return redirect("/")


@app.route('/param_test', methods=['POST', 'GET'])
def param_test():
    p1 = request.args.get("p1", "")  ##TODO: １つのparamしか取れない！
    p2 = request.args.get("p2", "")
    params = {
        "p1": p1,
        "p2": p2
    }
    return json.dumps(params)


@app.route('/param_test2', methods=['POST', 'GET'])
def param_test2():
    ## method of request : https://a2c.bitbucket.io/flask/api.html#flask.request
    if request.method == 'GET':
        p1 = request.args.get("p1", "")  ##TODO: １つのparamしか取れない！ 2つめはdefault valueである。
        p2 = request.args.get("p2", "")
        params = {
            "p1": p1,
            "p2": p2
        }
        return json.dumps(params)
    else:  ## POST
        content_type = request.headers["Content-Type"]
        if content_type == "application/json":  ##check if there is application/json in header
            print(request.values)  ## valueでheadersやdataの両方を取得できるようだが、combinedMultiDicttoとなり、展開方法がわからない。
            print((f'request.values: {request.values}'))  # 上記に同じ
            return json.dumps(request.json)
            # return request.data ##message body の中身を全て出力したいときはこちら。
        else:
            return "no content type : application/json in header"


def comment():
    if request.method == 'POST':
        do_the_login()
    else:  # GET
        show_the_login_form()


"""
def do_the_login():
    return "do_the_login()"

def show_the_login_form():
    return "show_the_login_form()"
"""

## this should be after @app.route
if __name__ == '__main__':
    app.debug = True
    app.run()
