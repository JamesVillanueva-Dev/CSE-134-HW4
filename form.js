// form.js: progressive enhancement for form-with-js.html.
//
// The form already works without this file: HTML attributes (required,
// type="email", minlength, maxlength) make the browser block bad
// submissions. This script adds clearer in-page error messages, a
// character counter for the comments box, and a record of failed
// submit attempts that is sent along with the form.
//
// The script is loaded with "defer", so it runs after the HTML has been
// parsed and every element below already exists.

// ---------------------------------------------------------------------
// 1. Find the elements we need
// ---------------------------------------------------------------------

const form = document.querySelector(".contact-form");
const errorArea = document.getElementById("error-area");
const commentsInfo = document.getElementById("comments-info");
const formErrorsField = document.getElementById("form-errors-field");
const comments = document.getElementById("comments");

// The three fields we validate. form.elements looks fields up by name.
const fields = [form.elements.name, form.elements.email, comments];

// Every failed submit attempt adds entries here. It only stores which
// field failed and why, never what the user typed.
const form_errors = [];

// Fields the user has typed in. We wait until a field has been edited
// before showing its error on blur, so tabbing through an empty form
// doesn't cover it in errors.
const editedFields = new Set();

// ---------------------------------------------------------------------
// 2. Error messages
// ---------------------------------------------------------------------

// The name shown at the start of each message, so the message makes
// sense on its own (for example when a screen reader announces it).
const fieldLabels = {
  name: "Name",
  email: "Email",
  comments: "Comments",
};

// The ValidityState flags we check, in the order we check them. The
// first one that is true is the reason the field is invalid.
const validityFlags = [
  "valueMissing",
  "typeMismatch",
  "tooShort",
  "tooLong",
  "patternMismatch",
  "badInput",
];

// Returns the name of the first failing flag, like "typeMismatch",
// or "customError" if only our custom message is set.
function failingFlag(field) {
  for (const flag of validityFlags) {
    if (field.validity[flag]) {
      return flag;
    }
  }
  return "customError";
}

// Works out the message for one field and stores it on the field with
// setCustomValidity. The browser then uses our message in its own
// popup on submit, and field.validity.valid stays in sync.
// Returns the message, or "" when the field is valid.
function updateValidity(field) {
  // Clear any old custom message first. While a custom message is set
  // the field always counts as invalid, so without this a field could
  // never become valid again.
  field.setCustomValidity("");

  const label = fieldLabels[field.name];
  let message = "";

  // field.validity is filled in by the browser from the HTML attributes.
  if (field.validity.valueMissing) {
    if (field.name === "email") {
      message = `${label}: Enter your email address, like name@example.com.`;
    } else if (field.name === "comments") {
      message = `${label}: Enter a message of at least ${field.minLength} characters.`;
    } else {
      message = `${label}: Enter your name.`;
    }
  } else if (field.validity.typeMismatch) {
    // Only type="email" can cause this here.
    message = `${label}: Enter an address like name@example.com.`;
  } else if (field.validity.tooShort) {
    // Uses the minlength attribute, so the message matches the HTML.
    // It doesn't include the live count, which the counter shows.
    message = `${label}: Enter at least ${field.minLength} characters.`;
  } else if (!field.validity.valid) {
    // Anything else (unlikely, since maxlength stops typing past the
    // limit). Still names the field.
    message = `${label}: Check this entry and try again.`;
  }

  // An empty string means "valid", so this is safe in both cases.
  field.setCustomValidity(message);
  return message;
}

// ---------------------------------------------------------------------
// 3. Showing and clearing errors in the page
// ---------------------------------------------------------------------

// Each field has its own error paragraph, like <p id="email-error">.
function errorParagraph(field) {
  return document.getElementById(`${field.id}-error`);
}

// True if the field's error paragraph currently has text in it.
function isErrorShowing(field) {
  return errorParagraph(field).textContent !== "";
}

// Puts the message in the field's error paragraph. An empty message
// clears it, and CSS (p:empty) then hides the paragraph completely.
// aria-invalid tells screen readers whether the field has an error.
function showError(field, message) {
  errorParagraph(field).textContent = message;
  if (message) {
    field.setAttribute("aria-invalid", "true");
  } else {
    field.removeAttribute("aria-invalid");
  }
}

// ---------------------------------------------------------------------
// 4. Character counter for the comments box
// ---------------------------------------------------------------------

// Remaining count at or below this shows the warning style.
const WARNING_AT = 100;

function updateCharacterCount() {
  // maxLength comes from the maxlength attribute, so the limit is only
  // written in one place (the HTML). The attribute also stops typing
  // and pasting past the limit.
  const limit = comments.maxLength;
  const remaining = limit - comments.value.length;

  // toLocaleString("en-US") adds the comma: 1000 becomes "1,000".
  const remainingText = remaining.toLocaleString("en-US");
  const limitText = limit.toLocaleString("en-US");

  if (remaining <= 0) {
    // Reaching the limit is allowed, so this is a notice, not an error.
    commentsInfo.textContent = `You've reached the ${limitText}-character limit.`;
  } else if (remaining <= WARNING_AT) {
    const unit = remaining === 1 ? "character" : "characters";
    commentsInfo.textContent = `Warning: only ${remainingText} ${unit} remaining.`;
  } else {
    commentsInfo.textContent = `${remainingText} characters remaining`;
  }

  // The class only changes colors (see styles.css), so nothing moves.
  commentsInfo.classList.toggle("is-warning", remaining <= WARNING_AT);
}

// ---------------------------------------------------------------------
// 5. Event listeners on each field
// ---------------------------------------------------------------------

for (const field of fields) {
  // "input" fires on every change: typing, pasting, deleting.
  field.addEventListener("input", () => {
    editedFields.add(field);
    const message = updateValidity(field);

    // Only touch the page if an error is already showing for this
    // field: update it, or clear it once fixed. New errors wait for
    // blur so the user isn't interrupted while typing.
    if (isErrorShowing(field)) {
      showError(field, message);
    }
  });

  // "blur" fires when the user leaves the field. If they typed in it,
  // show its error now, or clear it if it's fixed.
  field.addEventListener("blur", () => {
    if (editedFields.has(field)) {
      showError(field, updateValidity(field));
    }
  });

  // "invalid" fires once for each invalid field when the user tries to
  // submit (button click or Enter key). We never call checkValidity()
  // or reportValidity(), so it only fires on real submit attempts.
  field.addEventListener("invalid", () => {
    const message = updateValidity(field);

    // Record which field failed and why. No field values are stored.
    form_errors.push({
      field: field.name,
      error: failingFlag(field),
      message: message,
      time: new Date().toISOString(),
    });

    showError(field, message);
  });
}

// The counter also updates on "input". This is a second listener on
// the same textarea, separate from the validation one above.
comments.addEventListener("input", updateCharacterCount);

// ---------------------------------------------------------------------
// 6. Submitting
// ---------------------------------------------------------------------

// "submit" only fires once every field is valid. We copy the error
// history into the hidden field and let the normal POST happen (no
// preventDefault), so httpbin.org receives it as "form-errors".
form.addEventListener("submit", () => {
  formErrorsField.value = JSON.stringify(form_errors);
});

// ---------------------------------------------------------------------
// 7. Page load setup
// ---------------------------------------------------------------------

// Prepare custom messages for every field so the browser's submit
// popup already uses them. Nothing is shown in the page yet.
for (const field of fields) {
  updateValidity(field);
}

// Reveal the JavaScript-only areas. They start hidden in the HTML, so
// they never appear when JavaScript is off.
errorArea.hidden = false;
commentsInfo.hidden = false;
updateCharacterCount();
