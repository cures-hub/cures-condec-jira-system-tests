const chai = require("chai");
const { Builder, By } = require("selenium-webdriver");
const firefox = require('selenium-webdriver/firefox');
require("geckodriver");
const axios = require("axios");

const baseUrl = "http://localhost:2990/jira"
var sessionCookie;
describe("Test create decision knowledge", () => {
  // before(() => {
  //   axios.post(baseUrl + "/rest/auth/1/session", {
  //     username: "admin",
  //     password: "admin"
  //   })
  //   .then(res => {
  //     console.log("Loggin into local Jira...")
  //     console.log(res)
  //     sessionCookie = res.data.session;
  //     const token = res.headers["set-cookie"];
  //     console.log(token)
  //   })
  //   .catch(error => {
  //     console.error(error)
  //   })
  // });

  it("should do stuff", async () => {
    let driver = await new Builder()
      .forBrowser("firefox")
      .setFirefoxOptions(() => {
      setProfile("/Users/julia/Library/Application Support/Firefox/Profiles/gi2gkcor.SeleniumTester")})
      .build();
    try {
    
      await driver.get(baseUrl);
      await driver.get(baseUrl + "/secure/CreateIssue!default.jspa");
			// new WebDriverWait(driver, DEFAULT_TIME_OUT).until(ExpectedConditions.presenceOfElementLocated(By.id("jira")));
			// TODO: this will only work if Issue is already selected. It should be replaced with a less volatile method
			// like an HTTP request to create a decision knowledge issue.
			await driver.findElement(By.id("issue-create-submit")).click(); // this clicks the next button

			// // wait until the page loads and the summary box is present
			// new WebDriverWait(driver, DEFAULT_TIME_OUT).until(ExpectedConditions.presenceOfElementLocated(By.id("summary")));

			// // Write the name of the decision knowledge element
			// driver.findElement(By.id("summary")).sendKeys("Decision knowledge element 1");

			// // click the create button
			// driver.findElement(By.id("issue-create-submit")).click();

			// // Wait until the issue page loads
			// new WebDriverWait(driver, DEFAULT_TIME_OUT).until(ExpectedConditions.presenceOfElementLocated(By.id("type-val")));
      // // await driver.manage().options()

      // await driver.get(baseUrl);
      // await driver.sleep(5000);
    }
    finally {
      driver.quit()
    }
  console.log("pass");
  });
}, 30000);
