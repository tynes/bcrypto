#include <assert.h>
#include <string.h>
#include <node.h>
#include <nan.h>

#include "openssl/evp.h"
#include "pbkdf2/pbkdf2.h"
#include "pbkdf2.h"
#include "pbkdf2_async.h"

static Nan::Persistent<v8::FunctionTemplate> pbkdf2_constructor;

BPBKDF2::BPBKDF2() {}

BPBKDF2::~BPBKDF2() {}

void
BPBKDF2::Init(v8::Local<v8::Object> &target) {
  Nan::HandleScope scope;

  v8::Local<v8::FunctionTemplate> tpl =
    Nan::New<v8::FunctionTemplate>(BPBKDF2::New);

  pbkdf2_constructor.Reset(tpl);

  tpl->SetClassName(Nan::New("PBKDF2").ToLocalChecked());
  tpl->InstanceTemplate()->SetInternalFieldCount(1);

  Nan::SetMethod(tpl, "derive", BPBKDF2::Derive);
  Nan::SetMethod(tpl, "deriveAsync", BPBKDF2::DeriveAsync);

  v8::Local<v8::FunctionTemplate> ctor =
    Nan::New<v8::FunctionTemplate>(pbkdf2_constructor);

  target->Set(Nan::New("pbkdf2").ToLocalChecked(), ctor->GetFunction());
}

NAN_METHOD(BPBKDF2::New) {
  return Nan::ThrowError("Could not create PBKDF2 instance.");
}

NAN_METHOD(BPBKDF2::Derive) {
  if (info.Length() < 5)
    return Nan::ThrowError("pbkdf2.derive() requires arguments.");

  if (!info[0]->IsString())
    return Nan::ThrowTypeError("First argument must be a string.");

  v8::Local<v8::Object> kbuf = info[1].As<v8::Object>();

  if (!node::Buffer::HasInstance(kbuf))
    return Nan::ThrowTypeError("Second argument must be a buffer.");

  v8::Local<v8::Object> sbuf = info[2].As<v8::Object>();

  if (!node::Buffer::HasInstance(sbuf))
    return Nan::ThrowTypeError("Third argument must be a buffer.");

  if (!info[3]->IsNumber())
    return Nan::ThrowTypeError("Fourth argument must be a number.");

  if (!info[4]->IsNumber())
    return Nan::ThrowTypeError("Fifth argument must be a number.");

  Nan::Utf8String name_(info[0]);
  const char *name = (const char *)*name_;

  const uint8_t *data = (const uint8_t *)node::Buffer::Data(kbuf);
  uint32_t datalen = (uint32_t)node::Buffer::Length(kbuf);
  const uint8_t *salt = (const uint8_t *)node::Buffer::Data(sbuf);
  uint32_t saltlen = (size_t)node::Buffer::Length(sbuf);
  uint32_t iter = info[3]->Uint32Value();
  uint32_t keylen = info[4]->Uint32Value();

  uint8_t *key = (uint8_t *)malloc(keylen);

  if (key == NULL)
    return Nan::ThrowError("Could not allocate key.");

  if (!bcrypto_pbkdf2(name, data, datalen, salt, saltlen, iter, key, keylen)) {
    free(key);
    return Nan::ThrowError("PBKDF2 failed.");
  }

  info.GetReturnValue().Set(
    Nan::NewBuffer((char *)key, keylen).ToLocalChecked());
}

NAN_METHOD(BPBKDF2::DeriveAsync) {
  if (info.Length() < 6)
    return Nan::ThrowError("pbkdf2.deriveAsync() requires arguments.");

  if (!info[0]->IsString())
    return Nan::ThrowTypeError("First argument must be a string.");

  v8::Local<v8::Object> dbuf = info[1].As<v8::Object>();

  if (!node::Buffer::HasInstance(dbuf))
    return Nan::ThrowTypeError("Second argument must be a buffer.");

  v8::Local<v8::Object> sbuf = info[2].As<v8::Object>();

  if (!node::Buffer::HasInstance(sbuf))
    return Nan::ThrowTypeError("Third argument must be a buffer.");

  if (!info[3]->IsNumber())
    return Nan::ThrowTypeError("Fourth argument must be a number.");

  if (!info[4]->IsNumber())
    return Nan::ThrowTypeError("Fifth argument must be a number.");

  if (!info[5]->IsFunction())
    return Nan::ThrowTypeError("Sixth argument must be a Function.");

  v8::Local<v8::Function> callback = info[5].As<v8::Function>();

  Nan::Utf8String name_(info[0]);
  const char *name = (const char *)*name_;

  const EVP_MD *md = EVP_get_digestbyname(name);

  if (md == NULL)
    return Nan::ThrowTypeError("Could not allocate context.");

  const uint8_t *data = (const uint8_t *)node::Buffer::Data(dbuf);
  uint32_t datalen = (uint32_t)node::Buffer::Length(dbuf);
  const uint8_t *salt = (const uint8_t *)node::Buffer::Data(sbuf);
  uint32_t saltlen = (size_t)node::Buffer::Length(sbuf);
  uint32_t iter = info[3]->Uint32Value();
  uint32_t keylen = info[4]->Uint32Value();

  BPBKDF2Worker *worker = new BPBKDF2Worker(
    dbuf,
    sbuf,
    md,
    data,
    datalen,
    salt,
    saltlen,
    iter,
    keylen,
    new Nan::Callback(callback)
  );

  Nan::AsyncQueueWorker(worker);
}