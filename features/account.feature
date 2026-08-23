Feature: Account panel and the onboarding guide
  The account panel shows who is signed in and reopens the onboarding
  guide, whose bottom half is the daily top-20 — what film fans watch
  right now, rebuilt every day from TMDb trending and the iTunes top list.

  Read-only by construction: nothing here registers an account, changes a
  password or saves a film. Opening and closing the guide writes only the
  test account's own seen-flag, which its database rules scope to itself.

  Scenario: The account panel knows who I am
    When I open the account panel
    Then the account panel is open
    And the account panel shows the signed-in username
    When I close the account panel
    Then the account panel is closed

  Scenario: The guide opens from the account panel with the daily top-20
    When I open the account panel
    And I open the guide from the account panel
    Then the onboarding guide is open
    And the starter top-20 shows between 1 and 20 films
    When I close the onboarding guide
    Then the onboarding guide is closed
