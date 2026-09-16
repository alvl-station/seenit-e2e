Feature: Addresses — every place in the app is a path
  Read-only (REQ T-4): opening a page and pressing back write nothing.

  Scenario: The account page has its own address
    When I open the address "account"
    Then the account page is showing
    And the address is "/account"

  Scenario: Back from a page returns to the shelf and the address says so
    When I open the address "account"
    And the account page is showing
    When I press the browser's back
    Then the account page is closed
    And the address is "/films"

  Scenario: A page opened from inside the app writes its address
    When I open the recommendations flow
    Then the address is "/collections"

  Scenario: The collections page opens from its address
    When I open the address "collections"
    Then the collections page is showing

  Scenario: The die opens from its address
    When I open the address "swipe"
    Then the die's page is open
    And the address is "/swipe"

  Scenario: The door while signed in is the shelf
    When I open the address "login"
    Then the catalog shows at least one movie
    And the address is "/films"

  Scenario: A fresh visitor at the root meets the landing
    Then a fresh visitor at the root sees the landing with a way to sign in

  Scenario: A fresh visitor on a page is asked to sign in first
    Then a fresh visitor at "friends" is sent to "/login?next=friends"
