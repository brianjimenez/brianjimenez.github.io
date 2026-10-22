---
layout: post
title: "Hello, world"
description: "Why this blog exists: notes on AI and ML models, the technology around them, and what they mean for protein design."
tags: [meta, ai, machine-learning, protein-design]
---

This blog is a notebook for the place where machine learning, software and molecular biology meet. Mostly I want to think out loud about models: what they can do, how to tell whether they actually did it, and what it takes to turn a good result in a notebook into something that holds up in a lab.

## Why proteins, and why now

For a long time, predicting how a protein folds was one of biology's great open problems. Then structure prediction started to work. AlphaFold's results at CASP14 in 2020 changed what people assume is possible, and the 2024 Nobel Prize in Chemistry recognised both that work and the computational design of new proteins.

Generative models have since moved the question again. Diffusion models can sketch new backbones, inverse-folding networks propose sequences that should fold into them, and protein language models learn from evolution without being told what a structure is. The hard question is no longer only *can we predict this?* but *can we design what we want, and will it work when someone expresses it?*

## What I'll write about

- **Models as instruments.** Benchmarks, baselines and failure modes. How do you evaluate a generative model when the real test is an experiment that takes weeks?
- **Protein design in practice.** Docking and interfaces (how proteins recognise each other has been a thread in my work for years), design pipelines, and where machine learning genuinely helps versus where it only looks impressive.
- **Technology around the models.** Data quality, uncertainty, compute, and the tooling that makes results reproducible.

## What this is not

These are personal notes, not announcements. The views here are my own and do not represent my employer.

If something here is wrong, or you are working on similar problems, I would like to hear about it. You can find me on [GitHub](https://github.com/brianjimenez) and [LinkedIn](https://www.linkedin.com/in/brianjimenez).
