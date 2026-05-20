import hashlib
import hmac
import unittest
from unittest.mock import patch

from fastapi import HTTPException

from app.Code import razorpay_payments


class VerifyCheckoutSignatureTests(unittest.TestCase):
    """Cover both order and subscription signature verification paths."""

    def setUp(self) -> None:
        self._env_patcher = patch.dict(
            "os.environ",
            {
                "RAZORPAY_KEY_ID": "rzp_test_dummy",
                "RAZORPAY_KEY_SECRET": "secret_value_123",
            },
        )
        self._env_patcher.start()
        self.addCleanup(self._env_patcher.stop)

    @staticmethod
    def _signature(secret: str, message: str) -> str:
        return hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()

    def test_valid_order_signature_returns_true(self) -> None:
        signature = self._signature("secret_value_123", "order_ABC|pay_XYZ")
        self.assertTrue(
            razorpay_payments.verify_checkout_signature(
                razorpay_order_id="order_ABC",
                razorpay_payment_id="pay_XYZ",
                razorpay_signature=signature,
            )
        )

    def test_invalid_order_signature_returns_false(self) -> None:
        self.assertFalse(
            razorpay_payments.verify_checkout_signature(
                razorpay_order_id="order_ABC",
                razorpay_payment_id="pay_XYZ",
                razorpay_signature="deadbeef",
            )
        )

    def test_valid_subscription_signature_uses_payment_then_subscription(self) -> None:
        signature = self._signature("secret_value_123", "pay_XYZ|sub_DEF")
        self.assertTrue(
            razorpay_payments.verify_checkout_signature(
                razorpay_order_id=None,
                razorpay_payment_id="pay_XYZ",
                razorpay_signature=signature,
                razorpay_subscription_id="sub_DEF",
            )
        )

    def test_missing_order_and_subscription_returns_false(self) -> None:
        self.assertFalse(
            razorpay_payments.verify_checkout_signature(
                razorpay_order_id=None,
                razorpay_payment_id="pay_XYZ",
                razorpay_signature="x" * 64,
            )
        )

    def test_missing_secret_returns_false(self) -> None:
        with patch.dict("os.environ", {"RAZORPAY_KEY_SECRET": ""}):
            self.assertFalse(
                razorpay_payments.verify_checkout_signature(
                    razorpay_order_id="order_ABC",
                    razorpay_payment_id="pay_XYZ",
                    razorpay_signature="x" * 64,
                )
            )


class VerifyWebhookSignatureTests(unittest.TestCase):
    def test_valid_webhook_signature_returns_true(self) -> None:
        secret = "webhook_secret"
        body = b'{"event":"subscription.charged"}'
        signature = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        with patch.dict("os.environ", {"RAZORPAY_WEBHOOK_SECRET": secret}):
            self.assertTrue(
                razorpay_payments.verify_webhook_signature(
                    raw_body=body, signature_header=signature
                )
            )

    def test_missing_signature_returns_false(self) -> None:
        with patch.dict("os.environ", {"RAZORPAY_WEBHOOK_SECRET": "s"}):
            self.assertFalse(
                razorpay_payments.verify_webhook_signature(
                    raw_body=b"{}", signature_header=None
                )
            )

    def test_missing_secret_returns_false(self) -> None:
        with patch.dict("os.environ", {"RAZORPAY_WEBHOOK_SECRET": ""}):
            self.assertFalse(
                razorpay_payments.verify_webhook_signature(
                    raw_body=b"{}", signature_header="abc"
                )
            )


class ValidationTests(unittest.TestCase):
    def test_validate_amount_rejects_below_minimum(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            razorpay_payments._validate_amount(99)
        self.assertEqual(ctx.exception.status_code, 400)

    def test_validate_amount_accepts_minimum(self) -> None:
        razorpay_payments._validate_amount(100)

    def test_validate_amount_rejects_too_large(self) -> None:
        with self.assertRaises(HTTPException) as ctx:
            razorpay_payments._validate_amount(razorpay_payments.MAX_AMOUNT_PAISE + 1)
        self.assertEqual(ctx.exception.status_code, 400)

    def test_validate_amount_rejects_non_int(self) -> None:
        with self.assertRaises(HTTPException):
            razorpay_payments._validate_amount(True)  # type: ignore[arg-type]

    def test_validate_currency_normalizes(self) -> None:
        self.assertEqual(razorpay_payments._validate_currency("inr"), "INR")

    def test_validate_currency_rejects_unknown(self) -> None:
        with self.assertRaises(HTTPException):
            razorpay_payments._validate_currency("XYZ")

    def test_validate_receipt_rejects_unsafe_characters(self) -> None:
        with self.assertRaises(HTTPException):
            razorpay_payments._validate_receipt("not safe!!")

    def test_validate_receipt_accepts_safe(self) -> None:
        self.assertEqual(razorpay_payments._validate_receipt("order_1"), "order_1")

    def test_sanitize_notes_truncates_and_filters(self) -> None:
        raw = {"user id!": "x" * 500, "ok": "y", "bad key$": None}
        cleaned = razorpay_payments._sanitize_notes(raw)
        self.assertIn("user_id_", cleaned)
        self.assertEqual(cleaned["ok"], "y")
        self.assertNotIn("bad_key_", cleaned.get("bad_key_", ""))
        for value in cleaned.values():
            self.assertLessEqual(len(value), 250)


class SplitEventMetadataTests(unittest.TestCase):
    def test_extracts_known_entities(self) -> None:
        payload = {
            "event": "subscription.charged",
            "payload": {
                "subscription": {
                    "entity": {
                        "id": "sub_DEF",
                        "status": "active",
                        "plan_id": "plan_123",
                    }
                },
                "payment": {
                    "entity": {
                        "id": "pay_XYZ",
                        "status": "captured",
                        "amount": 9900,
                        "currency": "INR",
                    }
                },
            },
        }
        event, summary = razorpay_payments.split_event_metadata(payload)
        self.assertEqual(event, "subscription.charged")
        self.assertEqual(summary["subscription"]["id"], "sub_DEF")
        self.assertEqual(summary["payment"]["amount"], 9900)


if __name__ == "__main__":
    unittest.main()
