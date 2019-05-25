from flask import Flask, render_template
app = Flask(__name__)

@app.route("/hello/")
@app.route("/hello/<name>")
def hello(name=None): # set default paramter: name=None
    return render_template("hello.html", name=name) #このnameをhtml内で使用可能。


if __name__ == '__main__':
    app.debug = True
    app.run()
