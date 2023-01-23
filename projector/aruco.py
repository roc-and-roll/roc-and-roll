import cv2
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from threading import Thread

cam = cv2.VideoCapture(3)
if not cam.isOpened():
    print("Cannot open camera")
    exit()

app = Flask(__name__)
app.config['SECRET_KEY'] = '123123'
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

def detect_loop():
    while True:
        check, img = cam.read()
        detector = cv2.aruco.Dictionary_get(cv2.aruco.DICT_4X4_50)
        markerCorners, markerIds, _ = cv2.aruco.detectMarkers(img, detector)
        if markerCorners is not None and markerIds is not None:
            l = [{
                'id': c[0].tolist()[0],
                'points': [list(p.tolist()) for p in list(c[1][0])]
            } for c in zip(markerIds, markerCorners)]
            socketio.emit('points', l)

Thread(target=detect_loop).start()

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=3377)

