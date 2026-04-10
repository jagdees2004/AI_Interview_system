import sys
import firebase_admin
from firebase_admin import credentials, auth
import google.auth.credentials

class DummyCredential(google.auth.credentials.Credentials):
    def __init__(self):
        self.token = "dummy_token"

    def refresh(self, request):
        pass

    @property
    def valid(self):
        return True

firebase_admin.initialize_app(DummyCredential(), options={'projectId': 'ai-mock-interview-12345'})

try:
    auth.verify_id_token("invalid_token_test")
except Exception as e:
    print(repr(e))
