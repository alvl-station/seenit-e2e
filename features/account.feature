Feature: Account panel
  The account panel shows who is signed in.

  Read-only by construction: nothing here registers an account, changes a
  password or saves a film.

  Scenario: The account panel knows who I am
    When I open the account panel
    Then the account panel is open
    And the account panel shows the signed-in username
    # Strengthened with the Google feature: a password account gets the
    # change-password form; a Google account (covered in unit tests — OAuth
    # cannot be driven from CI) gets a provider note instead.
    And the account panel offers a password change
    When I close the account panel
    Then the account panel is closed

  Scenario: A fresh visitor is offered both ways in
    # A brand-new browser with no saved session must land on the login
    # screen and see the password form AND the Google button. OAuth itself
    # cannot be automated — Google's page is out of reach — but the entry
    # point going missing is exactly the regression worth catching.
    Then a fresh visitor sees the password form and the Google button
