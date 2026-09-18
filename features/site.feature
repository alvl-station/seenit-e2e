Feature: The site — the pages read before sign-in
  The front page shows this week's news from the catalogue, and every page
  of the site wears the app's own header, tab strip and cards. The front
  page's cards open the film in the app. Read-only (REQ T-4): nothing here
  writes anything.

  Scenario: A fresh visitor at the root meets the front page, with its news
    Then a fresh visitor at the root sees the front page with this week's news
    And the front page offers a stranger a way in and an account

  Scenario: Every page of the site carries its tabs and TMDB's notice
    Then every page of the site shows the tab strip and TMDB's notice

  Scenario: Each document has its own address and the section's menu
    Then each document opens at its own address with the section's menu

  Scenario: The word in the app's header leads to the front page, signed in
    When I press the word in the app's header
    Then the front page offers the way back into the app
    And I am still signed in

  Scenario: A card on the front page opens that film in the app
    When I open the first film on the front page
    Then that film's card is open in the app

  Scenario: Stories name their sources and credit their photos
    Then the stories page shows sourced stories with credited photos

  Scenario: A story's trailer asks YouTube nothing until it is tapped
    Then a trailer loads only when it is tapped, from the no-cookie player

  Scenario: The front page leads to the newest stories
    Then the front page leads to the newest stories
