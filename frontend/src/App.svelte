<script>
  let activity = {
    sport: '',
    duration: '',
    calories: ''
  }

  const creature = {
    name: 'Sprig',
    level: 3,
    energy: 68,
    happiness: 74
  }
</script>

<main class="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
  <div class="mx-auto grid w-full max-w-4xl gap-6 md:grid-cols-2">
    <section class="rounded-xl bg-white p-6 shadow">
      <h1 class="text-2xl font-bold">FitQuest</h1>
      <p class="mt-2 text-sm text-slate-600">
        Enregistre une activité sportive pour faire progresser ta créature.
      </p>

      <form class="mt-6 space-y-4">
        <div>
          <label class="mb-1 block text-sm font-medium" for="sport">Sport</label>
          <input
            id="sport"
            name="sport"
            type="text"
            bind:value={activity.sport}
            placeholder="Ex: Course"
            class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
          />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium" for="duration">Durée (min)</label>
            <input
              id="duration"
              name="duration"
              type="number"
              min="0"
              bind:value={activity.duration}
              placeholder="30"
              class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm font-medium" for="calories">Calories</label>
            <input
              id="calories"
              name="calories"
              type="number"
              min="0"
              bind:value={activity.calories}
              placeholder="250"
              class="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring"
            />
          </div>
        </div>

        <button
          type="button"
          class="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Envoyer (simulation)
        </button>
      </form>
    </section>

    <section class="rounded-xl bg-white p-6 shadow">
      <h2 class="text-xl font-semibold">Statistiques de la créature</h2>
      <div class="mt-4 space-y-3 text-sm">
        <p><span class="font-medium">Nom :</span> {creature.name}</p>
        <p><span class="font-medium">Niveau :</span> {creature.level}</p>
        <p><span class="font-medium">Énergie :</span> {creature.energy}%</p>
        <p><span class="font-medium">Bonheur :</span> {creature.happiness}%</p>
      </div>
    </section>
  </div>
</main>
