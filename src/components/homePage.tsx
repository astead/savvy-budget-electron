// homePage.js

import React from 'react';
import { Header } from './header.tsx';

export const HomePage: React.FC = () => {
  const year = new Date().getFullYear();
  const month = new Date().getMonth();

    return (
      <div className="App">
        <header className="App-header">
          <Header currTab="Home"/>
        </header>
        <div className="main-page-body-text">
          <b>Welcome to Savvy Budget.</b><br />
          Savvy Budget was initially created in 2002 as a way to track my personal budget.  
          In 2008 I made some modifications so others could create accounts and use the site.
          In 2010 I spend a considerable amount of time virtually re-creating the site to make it simpler and 
          more secure. Eventually I abandoned it and just moved to Mint because I loved having it automatically pull transactions.  
          Now that Mint is going away, I decided to resurrect this.  I again re-created the whole thing, this time making it so it can run
          locally with a local database file without needing hosting.  
          <br/><br/>
          <b>What is it?</b><br />
          Savvy Budget is a combination of envelope budgeting and transaction accounting.  The idea of envelope budgeting is that you have envelopes for
          each bill or spending item such as the electric bill or groceries.  You then set money aside from your paycheck into the appropriate envelopes
          so that you ensure you have enough money to pay them all.  Transaction accounting means that you have a credit and a debit for each transaction.
          Savvy Budget loosely applies this by taking money out of your income envelope when you set aside money in each envelope.  I call this process
          allocating a budget.  Savvy Budget is completely free to use.
          <br /><br />
          <b>Getting Started</b><br />
          Here is the basic process for getting started:<br />
          <li>Go to the <a href="/Configure">configure page</a> to create your local database file, envelopes and categories.</li>
          <li>Go to your bank website and download your statement in OFX format.</li>
          <li>Go to the <a href={"/Transactions/-3/0/"+year+"/"+month}>transaction page</a> and upload your OFX file.  Here you can also categorize your transactions.</li>
          <li>On the <a href="Envelopes">envelopes page</a>, using your previous spending habits as a guide, allocate your budget starting from the first month where you have data.</li>
          <br />
          Happy Budgeting!
          <br/><br/>
          Please send any bugs, feature requests, comments, questions to: alan.stead@gmail.com
          <br/><br/>
          If you want to pull your bank transactions automatically, you can set this up with Plaid.
          You'll have to create your own Plaid account and keys and authorization, but the infrastructure is all there.
        </div>
      </div>
    );
};
