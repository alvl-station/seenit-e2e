Feature: Account panel
  The account panel shows who is signed in.

  Read-only by construction: nothing here registers an account, changes a
  password or saves a film.

  Scenario: The account panel knows who I am
    When I open the account panel
    Then the account panel is open
    And the account panel shows the signed-in username
    # The picture in the circle stands in the profile head (2026-10-03).
    And the account panel shows my picture in a circle
    # «Мої дані» opens from the head's «Редагувати профіль» (2026-10-03).
    When I open the profile editor
    # Strengthened with the Google feature: a password account gets the
    # change-password form; a Google account (covered in unit tests — OAuth
    # cannot be driven from CI) gets a provider note instead.
    Then the account panel offers a password change
    When I close the account panel
    Then the account panel is closed

  Scenario: The account is a profile with five icon tabs, and statistics is PRO's
    # REQUIREMENTS PR-9. Read-only: the tabs switch pages, nothing is saved.
    # The lock is asserted against the account's own tier, so the scenario
    # holds whether or not the test account has PRO.
    # A profile since 2026-10-03 (owner's design): the head carries four
    # numbers, the tabs stand on the page, and «Мої дані» is behind the
    # head's edit button rather than a tab.
    When I open the account panel
    Then the profile head shows four numbers
    And the account's pages are: "Статистика, Досягнення, Друзі, Сервіси, Свайп"
    And the strip lends the account no row
    And the statistics page opens only with PRO
    When I open the account's "Сервіси" page
    Then the services are listed
    When I open the account's "Досягнення" page
    Then the achievements are listed
    # «Друзі» moved in from the bottom bar on 2026-10-02; its two lists are
    # a switch on the page since 2026-10-03.
    When I open the account's "Друзі" page
    Then the friends' two lists stand in the account, as a switch on the page

  Scenario: The swipe is a page of the account, and «Дивлюся» has its header cell
    # Owner's ask, 2026-09-25. Read-only: the deck is looked at, not swiped —
    # a swipe up would open the meter and a swipe down records «not seen».
    Then the header's words are: "Фільми, Серіали, Добірки, Дивлюся, Підбір"
    When I open the account panel
    And I open the account's "Свайп" page
    Then the swipe deck stands in the account with one film on it

  Scenario: «Дивлюся» is a page of its own, and the shelf stays under it
    # Owner's ask, 2026-09-25: the header word opens a page that repeats the
    # watching list, not the collection opened on the shelf. Read-only; the
    # page holds the account's series under way, or says what it is for.
    When I press the header word "Дивлюся"
    Then the watching page is open
    When I press the header word "Дивлюся"
    Then the watching page is closed

  Scenario: A fresh visitor is offered both ways in
    # A brand-new browser with no saved session must land on the login
    # screen and see the password form AND the Google button. OAuth itself
    # cannot be automated — Google's page is out of reach — but the entry
    # point going missing is exactly the regression worth catching.
    Then a fresh visitor sees the password form and the Google button
