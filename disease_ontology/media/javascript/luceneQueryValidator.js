/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Author: Kelvin Tan  (kelvint at apache.org)
// JavaScript Lucene Query Validator
// Version: $Id$
// Tested: IE 6.0.2800 and Mozilla Firebird 0.7

// Special characters are + - && || ! ( ) { } [ ] ^ " ~ * ? : \
// Special words are (case-sensitive) AND NOT OR

// validates a lucene query.
// @param Form field that contains the query
function doCheckLuceneQuery(queryField)
{
  return doCheckLuceneQueryValue(queryField.value)
}

// validates a lucene query.
// @param query string
function doCheckLuceneQueryValue(field, rules, i, options)
{
  query = field.val();       

  if(query != null && query.length > 0)
  {
    var errorMsg;
    //query = removeEscapes(query);

    // Make sure that our value is not our blur text
    if (query == "Search Ontology...") {
        return "* This field is required";
    }

    // check for allowed characters
    errorMsg = checkAllowedCharacters(query);
    if (errorMsg) return errorMsg;
    
    // check * is used properly
    //if (errorMsg) return false;
    
    // check for && usage
    errorMsg = checkAmpersands(query)
    if (errorMsg) return errorMsg;
    
    // check ^ is used properly 
    errorMsg = checkCaret(query)
    if (errorMsg) return errorMsg;
    
    // check ~ is used properly
    errorMsg = checkSquiggle(query)
    if (errorMsg) return errorMsg;
    
    // check ! is used properly 
    errorMsg = checkExclamationMark(query)
    if (errorMsg) return errorMsg;
    
    // check question marks are used properly
    errorMsg = checkQuestionMark(query)
    if (errorMsg) return errorMsg;
    
    // check parentheses are used properly
    errorMsg = checkParentheses(query)
    if (errorMsg) return errorMsg;
    
    // check '+' and '-' are used properly      
    errorMsg = checkPlusMinus(query)
    if (errorMsg) return errorMsg;
    
    // check AND, OR and NOT are used properly
    errorMsg = checkANDORNOT(query)
    if (errorMsg) return errorMsg;    
    
    // check that quote marks are closed
    errorMsg = checkQuotes(query)
    if (errorMsg) return errorMsg;
    
    // check ':' is used properly
    errorMsg = checkColon(query)
    if (errorMsg) return errorMsg;
  }
}

// remove the escape character and the character immediately following it
function removeEscapes(query)
{
  return query.replace(/\\./g, "");
}

function checkAllowedCharacters(query)
{
  matches = query.match(/[^a-zA-Z0-9_+\-:.()\"*?&|!{}\[\]\^~\\@#\/$%'= ]/);
  if(matches != null && matches.length > 0)
  {
    return "* Invalid character. Allowed characters are a-z A-Z 0-9.  _ + - : () \" & * ? | ! {} [ ] ^ ~ \\ @ = # % $ ' /.";
  }

  return false;
}

function checkAsterisk(query)
{
  matches = query.match(/^[\*]*$|[\s]\*|^\*[^\s]/);
  if(matches != null)
  {
    return "* The wildcard (*) character must be preceded by at least one alphabet or number.";
  }

    return false;
}

function checkAmpersands(query)
{
  // NB: doesn't handle term1 && term2 && term3 in Firebird 0.7
  matches = query.match(/[&]{2}/);
  if(matches != null && matches.length > 0)
  {
    matches = query.match(/^([a-zA-Z0-9_+\-:.()\"*?&|!{}\[\]\^~\\@#\/$%'=]+( && )?[a-zA-Z0-9_+\-:.()\"*?|!{}\[\]\^~\\@#\/$%'=]+[ ]*)+$/); // note missing & in pattern
    if(matches == null)
    {
      return "* Queries containing the special characters && must be in the form: term1 && term2.";
    }
  }

  return false;
}

function checkCaret(query)
{
  //matches = query.match(/^[^\^]*$|^([a-zA-Z0-9_+\-:.()\"*?&|!{}\[\]\~\\@#\/]+(\^[\d]+)?[ ]*)+$/); // note missing ^ in pattern
  matches = query.match(/[^\\]\^([^\s]*[^0-9.]+)|[^\\]\^$/);
  if(matches != null)
  {
    return "* The caret (^) character must be preceded by alphanumeric characters and followed by numbers.";
  }

  return false;
}

function checkSquiggle(query)
{
  //matches = query.match(/^[^~]*$|^([a-zA-Z0-9_+\-:.()\"*?&|!{}\[\]\^\\@#\/]+(~[\d.]+|[^\\]\\~)?[ ]*)+$/); // note missing ~ in pattern
  matches = query.match(/[^\\]~[^\s]*[^0-9\s]+/);
  if(matches != null)
  {
    return "* The tilde (~) character must be preceded by alphanumeric characters and followed by numbers.";
  }    

  return false;
}

function checkExclamationMark(query)
{
  // foo! is not a query, but !foo is. hmmmm...
  // NB: doesn't handle term1 ! term2 ! term3 or term1 !term2
  matches = query.match(/^[^!]*$|^([a-zA-Z0-9_+\-:.()\"*?&|!{}\[\]\^~\\@#\/$%'=]+( ! )?[a-zA-Z0-9_+\-:.()\"*?&|!{}\[\]\^~\\@#\/$%'=]+[ ]*)+$/);
  if(matches == null || matches.length == 0)
  {
    return "* Queries containing the special character ! must be in the form: term1 ! term2.";
  }

  return false;
}

function checkQuestionMark(query)
{
  matches = query.match(/^(\?)|([^a-zA-Z0-9_+\-:.()\"*?&|!{}\[\]\^~\\@#\/$%'=]\?+)/);
  if(matches != null && matches.length > 0)
  {
    return "* The question mark (?) character must be preceded by at least one alphabet or number.";
  }

  return false;
}

function checkParentheses(query)
{
  var hasLeft = false;
  var hasRight = false;
  matchLeft = query.match(/[(]/g);
  if(matchLeft != null) hasLeft = true
  matchRight = query.match(/[)]/g);
  if(matchRight != null) hasRight = true;
  
  if(hasLeft || hasRight)
  {
    if(hasLeft && !hasRight || hasRight && !hasLeft)
    {
        return "* Parentheses must be closed.";
    }
    else
    {
      var number = matchLeft.length + matchRight.length;
      if((number % 2) > 0 || matchLeft.length != matchRight.length)
      {
        return "* Parentheses must be closed.";
      }    
    }
    matches = query.match(/\(\)/);
    if(matches != null)
    {
      return "* Parentheses must contain at least one character.";
    }
  }  

  return false;
}

function checkPlusMinus(query)
{
  matches = query.match(/^[^\n+\-]*$|^([+-]?[a-zA-Z0-9_:.()\"*?&|!{}\[\]\^~\\@#\/$%'=]+[ ]?)+$/);
  if(matches == null || matches.length == 0)
  {
    return "* '+' and '-' modifiers must be followed by at least one alphabet or number.";
  }

  return false;
}

function checkANDORNOT(query)
{
  matches = query.match(/AND|OR|NOT/);
  if(matches != null && matches.length > 0)
  {
    matches = query.match(/^([a-zA-Z0-9_+\-:.()\"*?&|!{}\[\]\^~\\@\/#$%'=]+\s*((AND )|(OR )|(AND NOT )|(NOT ))?[a-zA-Z0-9_+\-:.()\"*?&|!{}\[\]\^~\\@\/#$%'=]+[ ]*)+$/);       
    if(matches == null || matches.length == 0)
    {
      return "* Queries containing AND/OR/NOT must be in the form: term1 AND|OR|NOT|AND NOT term2";
    }
    
    // its difficult to distinguish AND/OR/... from the usual [a-zA-Z] because they're...words!
    matches = query.match(/^((AND )|(OR )|(AND NOT )|(NOT ))|((AND)|(OR)|(AND NOT )|(NOT))[ ]*$/)
    if(matches != null && matches.length > 0)
    {
      return "Invalid search query!  Queries containing AND/OR/NOT must be in the form: term1 AND|OR|NOT|AND NOT term2";
    }
  }

  return false;
}

function checkQuotes(query)
{
  matches = query.match(/\"/g);
  if(matches != null && matches.length > 0)
  {
    var number = matches.length;
    if((number % 2) > 0)
    {
      return "* Please close all quote (\") marks.";
    }
    matches = query.match(/""/);
    if(matches != null)
    {
      return "* Quotes must contain at least one character.";
    }    
  }

  return false;
}

function checkColon(query)
{
  matches = query.match(/[^\\\s]:[\s]|[^\\\s]:$|[\s][^\\]?:|^[^\\\s]?:/);
  if(matches != null)
  {
    return "* Field declarations (:) must be preceded by at least one alphabet or number and followed by at least one alphabet or number.";
  }

  return false;
}
