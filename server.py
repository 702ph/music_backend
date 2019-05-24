import os
import sqlite3
import mimetypes
import io

from flask import Flask, json, jsonify, request, make_response, url_for  # なぜかrequestsでは動かない。
from flask_cors import CORS
from flask_restful import Api, http_status_message
from werkzeug.utils import secure_filename, redirect
# from mutagen.easyid3 import EasyID3 # to import mp3 tags
#import mutagen
from mutagen.easyid3 import EasyID3
from mutagen.mp3 import EasyMP3

## problem installing modules. have to type ./env/bin/pip

MAX_CONTENT_LENGTH = 16 * 1024 * 1024 # max file size = 16MB
UPLOAD_FOLDER = "static/uploads"
ALLOWED_EXTENSIONS = set(["mp3"])

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["DB_PATH"] = "db/music.db"
app.config['JSON_SORT_KEYS'] = False

api = Api(app)
CORS(app)

## for my practice
@app.route("/db")
def db():
    db_connection = sqlite3.connect(app.config["DB_PATH"])
    db_cursor = db_connection.cursor()
    # cursor.execute(".table") ##query でないので実行できないようだ。
    db_cursor.execute("select * from sqlite_master where type='table'")
    # cursor.execute("select * from aaa")
    fetch_all = db_cursor.fetchall()
    db_cursor.close()
    db_connection.close()
    return jsonify(fetch_all)


# return list of all column for song in json
@app.route("/songs/", methods=['GET'])
@app.route("/songs", methods=['GET'])
def db_test():
    db_connection = sqlite3.connect(app.config["DB_PATH"])
    db_cursor = db_connection.cursor()

    db_cursor.execute("select id, title, artist, album, year, genre, created_at from song")  # without data & path
    fetch_all = db_cursor.fetchall()
    description = db_cursor.description  # have to be placed after SQL Query

    # 1. variation
    """
    entries = []
    for row in fetch_all:
        entries.append({
            "id": row[0],
            "title": row[1],
            "album": row[2],
            "year": row[3],
            "genre": row[4],
            "created_at": row[5]
        })
    """

    # 2. variation as in slide from prof.
    """
    entries = [{
        "id": row[0],
        "title": row[1],
        "album": row[2],
        "year": row[3],
        "genre": row[4],
        "created_at": row[5]
    }for row in fetch_all]
    """

    # 3. variation (automatic key generation)
    entries = []  # array for all dictionaries
    for row in fetch_all:

        # dictionary for each row
        entry = {}
        for i_desc, val_desc in enumerate(description):
            entry.update({val_desc[0]: row[i_desc]})  # update() adds new element to dictionary. name doesn't fit!
        entries.append(entry)

    db_cursor.close()
    db_connection.close()

    result = jsonify(entries)
    return result



"""
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
"""


def allowed_file(filename):
    return "." in filename and \
           filename.rsplit(".",1)[1].lower() in ALLOWED_EXTENSIONS


def save_to_local_filesysytem(file):
    filename = secure_filename(file.filename)

    #1. variation
    #filepath = os.path.dirname(os.path.abspath(__file__)) + app.config["UPLOAD_FOLDER"]
    #absolute_filepath_name = filepath + "/" + filename

    # 2. variation
    os.getcwd()
    absolute_filepath_name = os.path.abspath(app.config["UPLOAD_FOLDER"]) + "/" + filename

    print(absolute_filepath_name)
    file.save(absolute_filepath_name)


def save_to_db(file):
    db_connection = sqlite3.connect(app.config["DB_PATH"])
    db_cursor = db_connection.cursor()

    #param = ("title", "album", "year", "genre", file, "created_at", "path",)
    #db_cursor.execute("insert into s(title, album, year, genre, data, created_at, path) values(?, ?, ?, ?, ?, ?, ?);", param)

    # https://codeday.me/jp/qa/20190110/126212.html
    # binary = sqlite3.Binary(file.stream.read()) # works!
    binary = sqlite3.Binary(file.read())  # works! same!
    #param2 = (binary,)
    #db_cursor.execute("insert into blob_demo(data) values(?);", param2)

    # get mp3 tags
    tags = get_mp3_infos(binary)

    print("save_to_db")
    print(tags)

    ##TODO: dictionaryに値が存在しない時、デフォルト値を与えられるか？？

    # insert
    #param = (tags["title"], tags["artist"], tags["album"], tags["date"], tags["genre"], binary, "created_at",)
    #db_cursor.execute("insert into song(title, artist, album, year, genre, data, created_at) values(?, ?, ?, ?, ?, ?, ?);", param)

    # update
    #param = (binary, 28,)
    #db_cursor.execute("update song set data=? where id=?;", param)

    db_cursor.close()
    db_connection.commit()
    db_connection.close()
    return True


def get_mp3_infos(file):
    # initiate EasyMP3 object
    mp3 = EasyMP3(io.BytesIO(file))

    ## return value
    result = dict()

    ## get length
    length = mp3.info.length
    result.update({"length": length})

    ## get tags #このやり方だと、mp3がそのタグの情報を持っている場合しか抽出されない！
    for key in mp3.tags:  # mp3.tags return key of dictionary. here ie.: title, artist, genre, date.
        # artist name is at 0. position in array in a dictionary(or tuple?). ie: {"artist":["artist name]}.
        # we have to get it by giving index 0.
        value = mp3.tags.get(key)[0]
        #print(value)
        result.update({key: value})


    ##これで全Keyをiterationできる！！
    #id3_tags = mp3.ID3
    #print(mp3_id3.valid_keys.keys())
    #keys = mp3_id3.valid_keys.keys()
    #for key in mp3.ID3.valid_keys.keys():
    #    print(key)


    def remove_array(array):
        if array is None:
            return None
        else:
            return array[0]

    f = remove_array

    id3_tags = dict()
    for key in mp3.ID3.valid_keys.keys():
        #id3_tags.update({key: remove_array(mp3.tags.get(key))})
        #value = None if mp3.tags.get(key) is None else mp3.tags.get(key)[0]
        value = mp3.tags.get(key)[0] if mp3.tags.get(key) is not None else None
        id3_tags.update({key: value})




    mp3_id3 = mp3.ID3(io.BytesIO(file))
    #print(mp3_id3.Get.items())
    #for k, v in mp3_id3.items():
    #    print(k, v)
    #print(mp3_id3.List.keys())
    #mp3_id3.pprint()

    ## これでkeyの一覧は取得できる！！！　##
    #for key in mp3_id3.valid_keys.keys():
    #id3_tags.update({key: mp3.ID3.get(key)[0]})
        #print(mp3_id3.get(key)[0]) ##これは動かない。
     #   print(key)

    #print(mp3_id3.get("artist", "not artist exists"))
    #print(mp3_id3.get("title", "no title exists"))

    # 間違ってないわ。中身は空っぽやわ。たぶんmp3.ID3(ファイル名）みたいにせなあかん。→やはりそうだった。これはEasyID3そのものや。
    #print(mp3_id3.items())

    mp3_t = mp3.tags #これはなんとEasyID3を返す！
    mp3.tags.pprint()


    print(id3_tags)
    return None
    #return result
    #return tags


@app.route("/songs", methods=["POST"])
def save_song():

    # http://flask.pocoo.org/docs/1.0/patterns/fileuploads/
    # check if the post request has the file part
    if not ("inputFile" in request.files or "input_file" in request.files):
        return jsonify({"error": "no file part"})

    file = None
    if "inputFile" in request.files:  # for HTML form
        file = request.files["inputFile"]
        # file2 = request.files.get("inputFile") #this also works? have't tried yet

    if "input_file" in request.files:  # for formData()
        file = request.files["input_file"]
        # file2 = request.files.get("input_file") ##this also works? have't tried yet

    # even so if user does not select file, browser also submit an empty part without filename
    if file.filename == "":
        return jsonify({"error": "has no filename"})

    if file and allowed_file(file.filename):
        #save_file_to_local(file)
        result = save_to_db(file)

        #return redirect(url_for("uploaded_file", filename=filename))
        return jsonify(result)


"""
@app.route("/songs", methods=["POST"])
def post_song():
    my_db = sqlite3.connect(app.config["DB_PATH"])
    cursor = my_db.cursor()

    # INSERT
    param = ("title", "album", "year", "genre", "data", "created_at", "path",)
    cursor.execute("insert into song(title, album, year, genre, data, created_at, path) values(?, ?, ?, ?, ?, ?, ?);", param)

    # get the last
    cursor.execute("select * from song where id = (select max(id) from song);")

    fetch_all = cursor.fetchall()
    cursor.close()
    my_db.commit() # changes will not be saved without commit
    my_db.close()
    return jsonify(fetch_all)
"""



def read_from_local_filesystem():
    # create response from local filesystem
    filename = "Lied.mp3"
    os.getcwd()  # get current path where this project exists
    absolute_filepath_name = os.path.abspath(app.config["UPLOAD_FOLDER"]) + "/" + filename
    # https://docs.python.org/ja/3/library/functions.html#open
    # r:read, b:binary for second parameter
    file = open(absolute_filepath_name, "rb").read()
    return file


def read_from_db(id):
    #create response from db
    db_connection = sqlite3.connect(app.config["DB_PATH"])
    db_cursor = db_connection.cursor()

    #execute SQL Query
    #db_cursor.execute("select * from blob_demo where rowid=?", (id,))
    db_cursor.execute("select data from song where id=?", (id,))
    row = db_cursor.fetchone()
    file = row[0]  # get 1. row

    ## close db
    db_cursor.close()
    db_connection.commit()
    db_connection.close()
    return file


@app.route("/songs/<id>", methods=["GET"])
def read_song(id):
    filename = "song.mp3"  # have to be implemented
    file = read_from_db(id)

    # create response
    response = make_response()
    response.data = file
    response.headers["Content-Disposition"] = "attachment; filename=" + filename
    response.mimetype = "audio/mpeg"

    print(response.mimetype)

    #https://qiita.com/kekeho/items/58b24c2400ead44f3561
    #mimetype = mimetypes.guess_type(file) # doesn't work
    #print(mimetype)
    return response



@app.route("/songs/<id>", methods=["DELETE"])
def delete_song(id):
    db_connection = sqlite3.connect("db/music.db")
    db_cursor = db_connection.cursor()
    param = (id,)

    fetch_all = None
    try:
        # delete
        db_cursor.execute("delete from song where id = ?", param)

        # after delete
        db_cursor.execute("select id,title,album,year,genre,created_at from s")  # without data & path
        fetch_all = db_cursor.fetchall()
    except sqlite3.Error as e:
        print("sqlite3.Error: ", e.args[0])

    db_cursor.close()
    db_connection.commit()  # changes will not be saved without commit
    db_connection.close()

    ## TODO: zukuenftig: aktuelle Liste der Lieder zurueckgeben
    return jsonify(fetch_all)


## error handling debugging
@app.route('/poppop', methods=['POST'])
def post_json():
  try:
    json = request.get_json()  # Get POST JSON
    NAME = json['name']
    result = {
      "data": {
        "id": 1,
        "name": NAME
        }
      }
    return jsonify(result)
  except Exception as e:
    result = error_handler(e)
    return result


@app.errorhandler(400)
@app.errorhandler(404)
@app.errorhandler(500)
def error_handler(error):
    response = jsonify({
        "error": {
                     "type": error.name,
                     "message": error.description
                 }
                       })
    return response, error.code



@app.route('/')
@app.route('/world')  # more routes can be defined
def hello_world():
    h = "Hello2"
    s = " 1"
    w = "World!1"
    # return "Hello World!"
    # return h+s+w
    return "index page"


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



## this should be after @app.route
if __name__ == '__main__':
    app.debug = True
    app.run()
