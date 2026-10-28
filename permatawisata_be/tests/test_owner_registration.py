import os
import sys
import unittest
from unittest.mock import Mock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app import app


class OwnerRegistrationTestCase(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    @patch("routes.owner_registration.get_db_connection")
    def test_registration_validates_fields_before_database_access(self, get_db_connection):
        response = self.client.post(
            "/api/owner/register",
            json={
                "villa_id": 70,
                "contact_name": "Mitra",
                "phone": "08123456789",
                "username": "villa_owner",
                "password": "short",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("8–128", response.get_json()["error"])
        get_db_connection.assert_not_called()

    @patch("routes.owner_registration.get_db_connection")
    def test_registration_saves_password_hash_and_waits_for_admin(self, get_db_connection):
        cursor = Mock()
        cursor.fetchone.side_effect = [
            {"id": 70},  # unassigned villa
            None,        # username not in users
            None,        # no pending registration with this username
        ]
        cursor.lastrowid = 11
        connection = Mock()
        connection.cursor.return_value = cursor
        get_db_connection.return_value = connection

        response = self.client.post(
            "/api/owner/register",
            json={
                "villa_id": 70,
                "contact_name": "Mitra",
                "phone": "08123456789",
                "username": "villa_owner",
                "password": "aman-password-123",
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["registration_id"], 11)
        inserted_query, inserted_params = cursor.execute.call_args.args
        self.assertNotEqual(inserted_params[4], "aman-password-123")
        self.assertTrue(inserted_params[4].startswith("scrypt:"))
        self.assertIn("'Menunggu'", inserted_query)
        connection.commit.assert_called_once()

    @patch("routes.owner_registration.get_db_connection")
    def test_admin_registration_list_requires_admin_jwt(self, get_db_connection):
        response = self.client.get("/api/admin/owner-registrations")

        self.assertEqual(response.status_code, 401)
        get_db_connection.assert_not_called()

    @patch("routes.owner_registration._admin_id_from_token", return_value=1)
    @patch("routes.owner_registration.get_db_connection")
    def test_admin_approval_creates_owner_and_links_villa(
        self,
        get_db_connection,
        _admin_id_from_token,
    ):
        cursor = Mock()
        cursor.fetchone.side_effect = [
            {"id": 1},  # authenticated admin
            {
                "id": 11,
                "villa_id": 70,
                "username": "villa_owner",
                "password_hash": "scrypt$stored-hash",
                "status": "Menunggu",
            },
            {"id": 70, "owner_user_id": None},
            None,  # username is still available
        ]
        cursor.lastrowid = 22
        cursor.rowcount = 1
        connection = Mock()
        connection.cursor.return_value = cursor
        get_db_connection.return_value = connection

        response = self.client.put(
            "/api/admin/owner-registrations/11/approve",
            json={"admin_note": "Data sudah diverifikasi."},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["owner_user_id"], 22)
        self.assertEqual(cursor.execute.call_count, 7)
        self.assertIn("INSERT INTO users", cursor.execute.call_args_list[4].args[0])
        self.assertIn("UPDATE villas", cursor.execute.call_args_list[5].args[0])
        self.assertIn("UPDATE owner_registration_requests", cursor.execute.call_args_list[6].args[0])
        connection.commit.assert_called_once()


if __name__ == "__main__":
    unittest.main()
