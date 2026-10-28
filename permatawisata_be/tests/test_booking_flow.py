import json
import os
import sys
import unittest
from datetime import date
from unittest.mock import Mock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app import app


class BookingFlowTestCase(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    @patch("routes.booking_routes.get_db_connection")
    def test_available_units_use_villa_price_when_unit_price_is_missing(
        self,
        get_db_connection,
    ):
        cursor = Mock()
        cursor.fetchone.side_effect = [
            {
                "id": 70,
                "name": "Villa Test",
                "img": "utama.png",
                "guests": 4,
                "price": 1250000,
            },
            None,
            None,
        ]
        cursor.fetchall.return_value = [
            {
                "id": 477,
                "villa_id": 70,
                "max_guests": 4,
                "price": 0,
                "img": None,
            }
        ]
        connection = Mock()
        connection.cursor.return_value = cursor
        get_db_connection.return_value = connection

        response = self.client.get(
            "/api/bookings/available-units",
            query_string={
                "villa_id": 70,
                "check_in": "2026-10-30",
                "check_out": "2026-10-31",
                "guests": 2,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["data"][0]["price_raw"], 1250000)

    @patch("routes.booking_routes.get_db_connection")
    def test_booking_serializes_selected_addons_for_mysql(self, get_db_connection):
        cursor = Mock()
        cursor.fetchone.side_effect = [
            {
                "id": 70,
                "name": "Villa Test",
                "price": 950000,
                "guests": 4,
            },
            {
                "id": 477,
                "villa_id": 70,
                "price": 950000,
                "max_guests": 4,
            },
            None,
            None,
        ]
        cursor.fetchall.return_value = [
            {
                "id": 5,
                "name": "Sarapan",
                "price": 50000,
                "addon_type": "Breakfast",
            }
        ]
        cursor.lastrowid = 301
        connection = Mock()
        connection.cursor.return_value = cursor
        get_db_connection.return_value = connection

        response = self.client.post(
            "/api/bookings",
            json={
                "villa_id": 70,
                "villa_detail_id": 477,
                "check_in": "2026-10-30",
                "check_out": "2026-10-31",
                "guests": 2,
                "full_name": "Pelanggan Test",
                "email": "customer@example.com",
                "whatsapp": "08123456789",
                "total_price": 1,
                "addons_info": [
                    {
                        "id": 5,
                        "name": "Sarapan",
                        "price": 50000,
                    }
                ],
            },
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["booking_id"], 301)
        self.assertEqual(response.get_json()["total_price"], 1000000)
        insert_params = cursor.execute.call_args.args[1]
        self.assertEqual(insert_params[9], 1000000)
        self.assertEqual(
            json.loads(insert_params[-1]),
            [{
                "id": 5,
                "name": "Sarapan",
                "price": 50000.0,
                "addon_type": "Breakfast",
            }],
        )
        connection.commit.assert_called_once()

    @patch("routes.booking_routes.get_db_connection")
    def test_booking_lookup_returns_latest_status_for_matching_email(
        self,
        get_db_connection,
    ):
        cursor = Mock()
        cursor.fetchone.return_value = {
            "booking_id": 301,
            "status": "Lunas",
            "check_in": date(2026, 10, 30),
            "check_out": date(2026, 10, 31),
            "guests": 2,
            "full_name": "Pelanggan Test",
            "total_price": 1000000,
            "payment_method": "BCA",
            "payment_type": "Manual",
            "villa_name": "Villa Test",
            "room_name": "Kamar Utama",
        }
        connection = Mock()
        connection.cursor.return_value = cursor
        get_db_connection.return_value = connection

        response = self.client.post(
            "/api/bookings/lookup",
            json={"order_id": "pw-301", "email": " CUSTOMER@example.com "},
        )

        self.assertEqual(response.status_code, 200)
        booking = response.get_json()["data"]
        self.assertEqual(booking["order_id"], "PW-301")
        self.assertEqual(booking["status"], "Lunas")
        self.assertEqual(booking["check_in"], "2026-10-30")
        self.assertNotIn("email", booking)
        self.assertEqual(
            cursor.execute.call_args.args[1],
            (301, "CUSTOMER@example.com"),
        )

    @patch("routes.booking_routes.get_db_connection")
    def test_booking_lookup_does_not_return_booking_for_wrong_email(
        self,
        get_db_connection,
    ):
        cursor = Mock()
        cursor.fetchone.return_value = None
        connection = Mock()
        connection.cursor.return_value = cursor
        get_db_connection.return_value = connection

        response = self.client.post(
            "/api/bookings/lookup",
            json={"order_id": "PW-301", "email": "wrong@example.com"},
        )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.get_json()["status"], "error")


if __name__ == "__main__":
    unittest.main()
