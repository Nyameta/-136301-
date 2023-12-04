class CameraActivity {
	constructor() {
		this.isTraining = false;
		CameraActivity.errLog = document.querySelector('#errors');
		CameraActivity.rssLog = document.querySelector('#results');
		this.#_config();
	}
	#_config() {
		this.config = { infTime: 2000, prob: 0.20, nor: 5, not: 3 }//defaults
		document.getElementById('configs').querySelectorAll('[data-set] button').forEach(dsb => {
			dsb.addEventListener('click', function () {
				let cParam = this.closest('[data-set]').dataset.set;
				CC.config[cParam] ||= 0;
				let cParamValue = CC.config[cParam], sib;
				if (this.nextElementSibling) {
					cParamValue--;
					sib = this.nextElementSibling;
					if (cParamValue < 0) cParamValue = 0;
				} else {
					cParamValue++;
					sib = this.previousElementSibling;
				}
				sib.innerText = cParam == 'prob' ? cParamValue.toFixed(2) : cParamValue;
				CC.config[cParam] = cParamValue;
			})
		})
		this.init();
	}
	init() {
		const video = document.createElement('video');
		navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(stream => {
			video.srcObject = stream;
			video.autoplay = true;
			let track = stream.getVideoTracks()[0];
			this.imageCapture = new ImageCapture(track);
			document.querySelector('#surface').append(video);
		}).catch(err => {
			console.log(err);
		})
		video.addEventListener('play', function (event) {
			event.stopImmediatePropagation(CC.run());
		})
	}
	run(t) {
		let captured = 0;
		this.isPaused = false;
		this.results = {}
		let config = CC.config;
		this.brain ||= JSON.parse(localStorage.currencyDetectionBrain ?? '{}');
		this.frameGrabInterval = setInterval(() => {
			if (this.isPaused) return;
			if (!document.hasFocus()) return;
			if (!this.isTraining && !Object.keys(this.brain).length) {
				return clearInterval(this.frameGrabInterval), CameraActivity.requestAITraining('Train your AI to make it useful');
			} else {
				if (captured >= config.nor) {
					if (t?.nodeName) t.innerText = 'Done';
					if (!this.isTraining) this.showResults();
					return clearInterval(this.frameGrabInterval), this.pauseMediaStream();
				}
				captured++;
				this.grabFrame('f' + captured);
			}
		}, config.infTime)
	}

	clearFrames() {
		document.querySelector('#frameGrabs').innerHTML = '';
	}

	refresh() {
		return this.clearFrames(), this.run();
	}

	pauseMediaStream() {
		document.querySelector('video')?.pause();
		this.isPaused = true;
	}

	resumeMediaStream() {
		document.querySelector('video')?.play();
	}

	drawCanvas(frameNo) {
		let canvas = document.createElement('canvas');
		canvas.id = frameNo;
		canvas.width = 150;
		canvas.height = 100;
		document.querySelector('#frameGrabs').append(canvas);
		return canvas;
	}

	grabFrame(frameNo) {
		this.imageCapture?.grabFrame().then(imageBitmap => {
			const canvas = this.drawCanvas(frameNo);
			this.drawImage(canvas, imageBitmap);
		}).catch(error => {
			CameraActivity.log(error)
		})
	}

	takePhoto(photoNo) {
		this.imageCapture?.takePhoto().then(blob => createImageBitmap(blob)).then(imageBitmap => {
			const canvas = this.drawCanvas(photoNo);
			this.drawImage(canvas, imageBitmap);
		}).catch(error => {
			CameraActivity.log(error)
		})
	}

	drawImage(canvas, img) {
		let ratio = Math.min(canvas.width / img.width, canvas.height / img.height);
		let x = (canvas.width - img.width * ratio) / 2;
		let y = (canvas.height - img.height * ratio) / 2;
		let width = img.width * ratio;
		let height = img.height * ratio;
		let ctx = canvas.getContext('2d');
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(img, 0, 0, img.width, img.height, x, y, width, height);
		this.analyseImage(ctx, width, height);
	}

	async analyseImage(imgCanvas, x, y) {
		let x1 = x * 1 / 8, x2 = x * 1 / 4, x3 = x * 1 / 2, x4 = x * 3 / 4;
		let y1 = y * 1 / 8, y2 = y * 1 / 4, y3 = y * 1 / 2, y4 = y * 3 / 4;
		let colorPointCoordinates = [
			[[x1, y1], [x1, y2], [x1, y3], [x1, y4]],
			[[x2, y2], [x2, y2], [x2, y3], [x2, y4]],
			[[x3, y3], [x3, y2], [x3, y3], [x3, y4]],
			[[x4, y4], [x4, y2], [x4, y3], [x4, y4]],
		]
		let colorCollection = []
		colorPointCoordinates.forEach(coordinate => {
			let ccc = [];
			coordinate.forEach((key, index) => {
				const imageData = imgCanvas.getImageData(key[0], key[1], 1, 1);
				const pixel = imageData.data;
				const color = [pixel[0], pixel[1], pixel[2]];
				ccc[index] = color;
			})
			colorCollection.push(ccc);
		})
		if (!this.isTraining) return this.MatchNote(colorCollection);
		this.brain[this.trainingModel] = colorCollection;
		localStorage.setItem('currencyDetectionBrain', JSON.stringify(this.brain));
	}

	async MatchNote(collections) {
		this.results ||= {};
		for (const currencyNote in this.brain) {
			let patterns = Object.values(this.brain[currencyNote]);

			let sumOfRinPattern = patterns.map(_p => _p[0]).map(x => x[0]).reduce((c, a) => Number(c) + Number(a));
			let sumOfGinPattern = patterns.map(_p => _p[1]).map(x => x[1]).reduce((c, a) => Number(c) + Number(a));
			let sumOfBinPattern = patterns.map(_p => _p[2]).map(x => x[2]).reduce((c, a) => Number(c) + Number(a));

			let sumOfRinCollection = collections.map(_c => _c[0]).map(x => x[0]).reduce((c, a) => Number(c) + Number(a));
			let sumOfGinCollection = collections.map(_c => _c[1]).map(x => x[1]).reduce((c, a) => Number(c) + Number(a));
			let sumOfBinCollection = collections.map(_c => _c[2]).map(x => x[2]).reduce((c, a) => Number(c) + Number(a));

			let rdiff = Math.abs(sumOfRinCollection - sumOfRinPattern);
			let gdiff = Math.abs(sumOfGinCollection - sumOfGinPattern);
			let bdiff = Math.abs(sumOfBinCollection - sumOfBinPattern);

			let rprob = rdiff / sumOfRinPattern * 100;
			let gprob = gdiff / sumOfGinPattern * 100;
			let bprob = bdiff / sumOfBinPattern * 100;
			this.results[currencyNote] ||= [];
			this.results[currencyNote].push(rprob + gprob + bprob);
		}
		CameraActivity.rssLog.innerHTML = 'Scanning&hellip;';
	}

	showResults() {
		let probability = this.results;
		let bvc = {}
		for (const probab in probability) {
			const prob = probability[probab];
			bvc[probab] = prob.reduce((c, a) => c + a) / prob.length;
		}
		let largest = Object.values(bvc).sort((a, b) => b - a)[0], matchedNote;
		for (const bb in bvc) {
			const bbc = bvc[bb];
			if (bbc == largest) matchedNote = bb;
		}
		if (!matchedNote || largest < 50) return CameraActivity.rssLog.innerText = 'Note not recognised!';
		CC.playMathedCurrencyNoteAudio(matchedNote);
		let ml = { 1000: 'thousand', 500: 'five hundred', '200': 'two hundred', '100': 'one hundred', '50': 'fifty' }
		CameraActivity.rssLog.innerHTML = `You're holding a ${ml[matchedNote]} shilling.<br> Accuracy: ${largest}%`;
	}

	static requestAITraining(msg) {
		CC.pauseMediaStream();
		msg = `<h1>${msg}</h1>`;
		msg += `
		<div class="text-end" actions>
			<button type="button" class="btn btn-primary btn-sm" onclick="CC.initAITrainer(this)">Train AI</button>
		</div>`;
		return CameraActivity.showDialog(msg);
	}

	playMathedCurrencyNoteAudio(matchedNote) {
		let aps = () => document.querySelector('audio#s' + matchedNote);
		if (!aps()) {
			let sound = document.createElement('audio');
			sound.id = 's'.concat(matchedNote);
			sound.src = 'sounds/' + String(matchedNote).concat('.mp3');
			sound.type = 'audio/mpeg';
			document.querySelector('footer').append(sound);
		}
		return aps()?.play();
	}

	static showDialog(msg) {
		let dialog = () => document.querySelector('dialog');
		if (!dialog()) {
			let d = document.createElement('dialog');
			d.classList.add('border-0', 'col-10', 'col-sm-4', 'rounded-4', 'lh-lg');
			document.body.prepend(d);
		}
		let dd = dialog();
		dd.innerHTML = msg;
		dd.showModal();
		return dd;
	}

	initAITrainer(x) {
		x.closest('dialog')?.close();
		function t() {
			document.querySelector('section#configs').classList.toggle('d-none');
			let tc = document.querySelector('form#cover');
			tc.classList.toggle('d-none');
			tc.querySelector('button#leaveTraining')?.addEventListener('click', function () {
				this.removeAttribute('id');
				t();
			})
		}
		return t();
	}

	startTrainingModel(mf) {
		try {
			this.isTraining = true;
			this.trainingModel = mf.model.value;
			let trainingGuide = `
			<div class="d-grid text-center gap-3">
				<div>Hold your ${CC.trainingModel}Kes on the camera view ensuring all the edges are clearly visible and click on start</div>
				<div class="text-center"><button type="button" class="btn btn-info">OK</button></div>
			</div>`;
			let dd = CameraActivity.showDialog(trainingGuide);
			dd.querySelector('button').addEventListener('click', function () {
				this.closest('dialog').close();
				CC.resumeMediaStream();
				CC.clearFrames();
				function t() {
					document.querySelector('form#cover').classList.toggle('d-none');
					let cc = document.querySelector('section#trainingProgress')
					cc.classList.toggle('d-none');
					let tbb = cc.querySelector('button.trainingterminator');
					if (!tbb) return;
					cc.querySelector('button#train').addEventListener('click', function () {
						this.innerHTML = `
						<svg width="2rem" height="2rem" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
							<g>
								<rect width="2" height="5" x="11" y="1" fill="currentColor" opacity=".14"/>
								<rect width="2" height="5" x="11" y="1" fill="currentColor" opacity=".29" transform="rotate(30 12 12)"/>
								<rect width="2" height="5" x="11" y="1" fill="currentColor" opacity=".43" transform="rotate(60 12 12)"/>
								<rect width="2" height="5" x="11" y="1" fill="currentColor" opacity=".57" transform="rotate(90 12 12)"/>
								<rect width="2" height="5" x="11" y="1" fill="currentColor" opacity=".71" transform="rotate(120 12 12)"/>
								<rect width="2" height="5" x="11" y="1" fill="currentColor" opacity=".86" transform="rotate(150 12 12)"/>
								<rect width="2" height="5" x="11" y="1" fill="currentColor" transform="rotate(180 12 12)"/>
								<animateTransform attributeName="transform" calcMode="discrete" dur="0.75s" repeatCount="indefinite" type="rotate" values="0 12 12;30 12 12;60 12 12;90 12 12;120 12 12;150 12 12;180 12 12;210 12 12;240 12 12;270 12 12;300 12 12;330 12 12;360 12 12"/>
							</g>
						</svg>`;
						CC.run(this);
					})
					tbb.addEventListener('click', function () {
						this.classList.remove('trainingterminator');
						CC.isTraining = false;
						t();
					})
				}
				return t();
			})
		} catch (error) {
			console.log(error);
		}
	}

	static log(err) {
		CameraActivity.errLog.innerText = err.message ?? err;
	}
}

const CC = new CameraActivity();

