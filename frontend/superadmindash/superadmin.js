(function(){
	const API = (typeof window !== 'undefined' && window.API_BASE) ? String(window.API_BASE).replace(/\/$/, '') : 'http://localhost:3000';
	// map cards in the DOM to canteen IDs
	const CAN_TEEN_IDS = {
		Mahagedara: 2,
		Meta: 1,
		Halabodan: 3
	};

	async function fetchStats(canteenId){
		const res = await fetch(`${API}/menu-items?canteen_id=${canteenId}`);
		const data = await res.json();
		if (!data.success) throw new Error('Failed');
		return {
			total: Number(data.stats?.total || 0),
			available: Number(data.stats?.available || 0),
			unavailable: Number(data.stats?.unavailable || 0)
		};
	}

	async function refresh(){
		let grand = { total:0, available:0, unavailable:0 };
		const cards = document.querySelectorAll('.canteen-card');
		for (const card of cards){
			const title = card.querySelector('.canteen-header')?.textContent?.trim();
			const id = CAN_TEEN_IDS[title];
			if (!id) continue;
			try {
				const s = await fetchStats(id);
				grand.total += s.total; grand.available += s.available; grand.unavailable += s.unavailable;
				const boxes = card.querySelectorAll('.canteen-box p');
				if (boxes[0]) boxes[0].textContent = s.total;
				if (boxes[1]) boxes[1].textContent = s.available;
			} catch (e) {
				console.error('Failed stats for', title, e);
			}
		}
		// update top stats
		const top = document.querySelectorAll('.stats .stat-box h3');
		if (top[0]) top[0].textContent = grand.total;
		if (top[1]) top[1].textContent = grand.available;
		if (top[2]) top[2].textContent = grand.unavailable;
	}

	document.addEventListener('DOMContentLoaded', () => {
		refresh();
		// simple polling for a real-time effect
		setInterval(refresh, 4000);
		// wire logout
		const logout = document.querySelector('.logout-btn');
		if (logout) logout.addEventListener('click', ()=>{ window.location.href = '../Admin/SuperAdminLogin.html'; });
		// wire view buttons to open userview pages
		document.querySelectorAll('.canteen-card').forEach(card => {
			const title = card.querySelector('.canteen-header')?.textContent?.trim();
			const btn = card.querySelector('.view-btn');
			if (!btn) return;
			btn.addEventListener('click', () => {
				if (title === 'Meta') window.location.href = '../userview/meta.html';
				else if (title === 'Mahagedara') window.location.href = '../userview/mahagedara.html';
				else window.location.href = '../userview/halabojan.html';
			});
		});
	});
})();
