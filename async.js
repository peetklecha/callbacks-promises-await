const axios = require("axios")
const fs = require("fs")
const readFilePromise = require("util").promisify(fs.readFile)
const string = data => data.toString().slice(0, -1)

//CHAPTER 1. The old way of doing things. When you call an asynchronous functions, you are just kicking it off and immediately moving on to the next line. You can never check back in on the function or touch it any way -- it is gone forever. So if you want something to happen *after* that function completes, you need to schedule that second function right when you call the first one, by passing it in as a callback.

fs.readFile("one", (err, data) => {
	if (err) console.log("Oops, there was an error:", err)
	else console.log(string(data))
})

//CHAPTER 2. The newer (but not newest) way of doing things. When you call an asynchronous function, you are still just kicking it off and immediately moving on to the next line. But you are immediately given a Promise, which is just a little object that keeps tabs on your asynchronous function as it does its own thing. Sort of like the buzzer thing they give you at Panera that lights up when your food is ready.

//readFilePromise is just like fs.ReadFile, but instead of taking a callback, it returns a Promise. You can still schedule a function to run after the file-read is complete by using a Promise method called ".then". You can also schedule a function to run in case of error by using a Promise method called ".catch".

const promise = readFilePromise("one")
promise
	.then(data => console.log(string(data)))
	.catch(err => console.log("Oops, there was an error:", err))

//I wrote this out slightly longer just to make clear that there is a promise there. Here's how I would actually write it:

readFilePromise("one")
	.then(data => console.log(string(data)))
	.catch(err => console.log("Oops, there was an error:", err))

//Note that we are still using callbacks! Promises themselves don't get rid of callbacks. But they do let us avoid *nesting* callbacks, AKA the infamous Callback Hell. This problem arises when we want multiple asynchronous functions to happen in sequence. For instance, imagine we want to write a "scavenger hunt" function that will read one file which contains the name of another file, get that other file's name, and then read that file.

function scavengerHuntWithCallbacks(fileName1) {
	fs.readFile(fileName1, (err, data1) => {
		if (err) console.log("Oops, there was an error:", err)
		else {
			const fileName2 = string(data1)
			fs.readFile(fileName2, (err, data2) => {
				if (err) console.log("Oops, there was an error:", err)
				else console.log(string(data2))
			})
		}
	})
}

scavengerHuntWithCallbacks("one")

//Yuck, what a mess it was to define scavengerHuntWithCallbacks. And look how neat it would be to write the same function if we used promises instead.

function scavengerHuntWithPromiseDotThen(fileName1) {
	return readFilePromise(fileName1)
		.then(data1 => readFilePromise(string(data1)))
		.then(data2 => console.log(string(data2)))
		.catch(err => console.log("Oops, there was an error:", err))
}

scavengerHuntWithPromiseDotThen("one")

//That is a lot nicer! It's sequential, instead of nesting, and we can handle all possible errors with a single .catch(). [Notice that I return on line 47; that doesn't affect what happens on line 53 at all, but it just means that I could use .then on this function in case I wanted to continue chaining with it later.] We are no longer in Callback Hell, but we are still in Callback Purgatory though -- it's still pretty painful to write all these dot thens and arrows and stuff. That brings us to...

//CHAPTER 3. async/await.

async function scavengerHuntWithPromiseAsyncAwait(fileName1) {
	try {
		const data1 = await readFilePromise(fileName1)
		const data2 = await readFilePromise(string(data1))
		console.log(string(data2))
	} catch (err) {
		console.log("Oops, There was an error:", err)
	}
}

scavengerHuntWithPromiseAsyncAwait("one")

//This is how I would normally write that function. But just to make clear that promises are still playing an important role in async/await, here is the same function, a little less tersely:

async function scavengerHuntWithPromiseAsyncAwait(fileName1) {
	try {
		const promise1 = readFilePromise(fileName1)
		const data1 = await promise1
		const promise2 = readFilePromise(string(data1))
		const data2 = await promise2
		console.log(string(data2))
	} catch (err) {
		console.log("Oops, There was an error:", err)
	}
}

//The async/await flow is way better because it lets us use vanilla JS stuff we are already familiar with -- calling functions and getting their responses as a const, try/catch, etc. The DotThen approach doesn't look so bad when we compare the two functions above, and indeed I think that it is still sometimes perfectly cromulent to use dot then and/or dot catch. But the best thing about async/await is that it makes refactoring really simple. Suppose I wanted to make a small change to my scavenger hunt function -- I want to log the chain of filenames as the end along with the data it got. For the purposes of the async function, all I need to do is change the console.log. But for .then, it's much clunkier, because the two .thens do not share the same scope.

function logChainWithDotThen(name1) {
	let name2
	return readFilePromise(name1)
		.then(data1 => {
			name2 = string(data1)
			return readFilePromise(string(data1))
		})
		.then(data2 => console.log(name1 + "=>" + name2 + "=>" + string(data2)))
		.catch(err => console.log("Oops, there was an error:", err))
}

logChainWithDotThen("one")

async function logChainWithAwait(name1) {
	try {
		const data1 = await readFilePromise(name1)
		const data2 = await readFilePromise(string(data1))
		console.log(name1 + "=>" + string(data1) + "=>" + string(data2))
	} catch (err) {
		console.log("Oops, There was an error:", err)
	}
}

logChainWithAwait("one")

//The reason async/await is able to make things so simple is that it actually pauses the function on the "await" and moves on, only coming back to the awaited-function when the rest of the file has finished executing.

async function getCNN_async_await() {
	console.log("2in do two things before await")
	await axios.get("http://www.cnn.com") // pause on this line, come back when the rest of the file is done
	console.log("4in do two things after await")
}

console.log("1before do two things")
getCNN_async_await()
console.log("3after do two things")

//same thing, but with .then. Almost exactly the same thing is happening, here, take note that "return" takes the place of "await"!
function getCNN_dot_then() {
	console.log("2in do two things before await")
	return axios.get("http://www.cnn.com").then(() => {
		console.log("4in do two things after await")
	})
}

//Here's one more side-by-side-by-side comparison of callbacks, Promise.then, and async+await:

//an async function i made up that takes callbacks.
function waitTwoSecondsWithCallback(callback) {
	setTimeout(callback, 2000)
}

//here's how i might use it. oof, all that nesting!
function countDownWithCallback() {
	waitTwoSecondsWithCallback(() => {
		console.log("You have six seconds, starting now!!")
		waitTwoSecondsWithCallback(() => {
			console.log("You have four seconds left.")
			waitTwoSecondsWithCallback(() => {
				console.log("You have just two seconds left. You'd better hurry!!")
				waitTwoSecondsWithCallback(() => {
					console.log("That's it!! Time's up!!")
				})
			})
		})
	})
}

//an async function i wrote that returns a promise instead.*
function waitTwoSecondsWithPromise() {
	return new Promise(resolve => setTimeout(resolve, 2000))
}

//here's how i would use it using DotThen notation. pretty clunky still but at least it's not nested.
function countDownWithPromiseDotThen() {
	waitTwoSecondsWithPromise()
		.then(() => {
			console.log("You have six seconds, starting now!!")
			return waitTwoSecondsWithPromise()
		})
		.then(() => {
			console.log("You have four seconds left.")
			return waitTwoSecondsWithPromise()
		})
		.then(() => {
			console.log("You have just two seconds left. You'd better hurry!!")
			return waitTwoSecondsWithPromise()
		})
		.then(() => {
			console.log("That's it! Time's up!!")
		})
}

//using the same promise-based version, with async await. so clean!
async function countDownWithPromiseAsyncAwait() {
	await waitTwoSecondsWithPromise()
	console.log("You have six seconds, starting now!!")
	await waitTwoSecondsWithPromise()
	console.log("You have four seconds left.")
	await waitTwoSecondsWithPromise()
	console.log("You have just two seconds left. You'd really better hurry!!")
	await waitTwoSecondsWithPromise()
	console.log("That's it! Time's up!!")
}

countDownWithCallback()
countDownWithPromiseDotThen()
countDownWithPromiseAsyncAwait()

//*the only time you would really need to actually use "new Promise" is if you're converting a callback-style async function into a promise one. it's nice to know how it works anyway, though.

function newPromise() {
	return new Promise((resolve, reject) => {
		//do your async stuff
		if (error) reject(error)
		else resolve(whatShouldBeReturned)
		//lots of ugly callback brackets
	})
}
